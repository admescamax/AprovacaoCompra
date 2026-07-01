const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const serverRequire = createRequire(path.join(__dirname, '..', 'server', 'server.js'));
const fetch = serverRequire('node-fetch');

serverRequire('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OMIE_KEY = process.env.OMIE_VP_APP_KEY || process.env.OMIE_APP_KEY;
const OMIE_SECRET = process.env.OMIE_VP_APP_SECRET || process.env.OMIE_APP_SECRET;
const INTERNAL_PREFIXES = ['VPCON', 'VPIN'];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function isCatalogCode(code) {
    const value = String(code || '').trim().toUpperCase();
    return value.startsWith('VP') && !INTERNAL_PREFIXES.some(prefix => value.startsWith(prefix));
}

async function omie(endpoint, call, param, tries = 3) {
    let lastError;
    for (let attempt = 1; attempt <= tries; attempt++) {
        try {
            const resp = await fetch(`https://app.omie.com.br/api/v1/${endpoint}/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ call, app_key: OMIE_KEY, app_secret: OMIE_SECRET, param: [param] }),
            });
            const data = await resp.json();
            if (data.faultstring) throw new Error(data.faultstring);
            return data;
        } catch (error) {
            lastError = error;
            const redundant = /Aguarde\s+(\d+)\s+segundos/i.exec(error.message);
            await sleep(redundant ? (Number(redundant[1]) + 2) * 1000 : 700 * attempt);
        }
    }
    throw new Error(`${call}: ${lastError.message}`);
}

async function supabase(pathAndQuery, options = {}) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            ...(options.headers || {}),
        },
    });
    if (!resp.ok) {
        throw new Error(`Supabase ${resp.status}: ${(await resp.text()).slice(0, 500)}`);
    }
    if (resp.status === 204) return null;
    const text = await resp.text();
    return text ? JSON.parse(text) : null;
}

async function listarEstoqueAtual() {
    const estoque = new Map();
    const hoje = new Date().toLocaleDateString('pt-BR');
    let page = 1;
    let totalPages = 1;

    do {
        const data = await omie('estoque/consulta', 'ListarPosEstoque', {
            nPagina: page,
            nRegPorPagina: 50,
            dDataPosicao: hoje,
            cExibeTodos: 'N',
        });

        totalPages = Number(data.nTotPaginas || 1);
        for (const item of data.produtos || []) {
            const id = String(item.nCodProd || item.codigo_produto || '');
            if (!id) continue;
            const saldo = Number(item.nSaldo ?? item.fisico ?? item.quantidade ?? 0);
            estoque.set(id, (estoque.get(id) || 0) + saldo);
        }

        if (page % 20 === 0 || page === totalPages) {
            console.error(`[estoque] paginas ${page}/${totalPages}; itens com saldo ${estoque.size}`);
        }
        page++;
    } while (page <= totalPages);

    return estoque;
}

function getCodigoVP(produto) {
    const candidates = [
        produto.codigo,
        produto.codigo_produto_integracao,
        produto.codigo_produto_servico,
    ];

    return candidates
        .map(value => String(value ?? '').trim())
        .find(value => /^VP/i.test(value)) || '';
}

async function carregarProdutosOmie() {
    const produtos = new Map();
    let page = 1;
    let totalPages = 1;

    do {
        const data = await omie('geral/produtos', 'ListarProdutos', {
            pagina: page,
            registros_por_pagina: 500,
            apenas_importado_api: 'N',
            filtrar_apenas_omiepdv: 'N',
            inativo: 'N',
        });

        totalPages = Number(data.total_de_paginas || 1);
        for (const produto of data.produto_servico_cadastro || []) {
            const codigo = getCodigoVP(produto);
            if (!isCatalogCode(codigo)) continue;
            produtos.set(codigo.toUpperCase(), {
                codigo_produto: String(produto.codigo_produto),
                codigo,
                descricao: produto.descricao,
                unidade: produto.unidade || 'UN',
                ncm: produto.ncm || null,
                ean: produto.ean || null,
            });
        }

        if (page % 10 === 0 || page === totalPages) {
            console.error(`[produtos] paginas ${page}/${totalPages}; cadastros VP ${produtos.size}`);
        }
        page++;
    } while (page <= totalPages);

    return produtos;
}

async function carregarProdutosSupabase() {
    const rows = await supabase('omie_produtos?select=codigo_produto,codigo,descricao,unidade,ncm,ean&codigo=ilike.VP*&limit=10000');
    return new Map(rows.map(row => [String(row.codigo || '').toUpperCase(), row]));
}

async function publicar(rows) {
    await supabase('omie_produtos?ativo=eq.true', {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ ativo: false, updated_at: new Date().toISOString() }),
    });

    const batchSize = 500;
    let total = 0;
    for (let index = 0; index < rows.length; index += batchSize) {
        const batch = rows.slice(index, index + batchSize);
        await supabase('omie_produtos', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify(batch),
        });
        total += batch.length;
    }
    return total;
}

function deduplicarPorProduto(rows) {
    const byId = new Map();

    for (const row of rows) {
        const current = byId.get(row.codigo_produto);
        if (!current) {
            byId.set(row.codigo_produto, row);
            continue;
        }

        byId.set(row.codigo_produto, {
            ...current,
            descricao: current.descricao || row.descricao,
            valor_unitario: row.valor_unitario || current.valor_unitario,
            estoque_atual: Math.max(Number(current.estoque_atual || 0), Number(row.estoque_atual || 0)),
            updated_at: row.updated_at,
        });
    }

    return [...byId.values()];
}

async function main() {
    const sourcePath = path.join(__dirname, 'catalogo-vendidos-produtos.json');
    const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const produtosVendidos = (source.produtos || []).filter(produto => isCatalogCode(produto.codigo));

    const [estoquePorId, produtosSupabase, produtosOmie] = await Promise.all([
        listarEstoqueAtual(),
        carregarProdutosSupabase(),
        carregarProdutosOmie(),
    ]);

    const now = new Date().toISOString();
    const rows = [];
    const semCadastro = [];

    for (const produto of produtosVendidos) {
        const codigo = String(produto.codigo || '').trim();
        const cadastro = produtosOmie.get(codigo.toUpperCase()) || produtosSupabase.get(codigo.toUpperCase());
        if (!cadastro?.codigo_produto) {
            semCadastro.push({ codigo, descricao: produto.descricao });
            continue;
        }

        rows.push({
            codigo_produto: String(cadastro.codigo_produto),
            codigo,
            descricao: String(produto.descricao || cadastro.descricao || ''),
            unidade: String(cadastro.unidade || 'UN'),
            valor_unitario: Number(produto.ultimo_valor_unitario || 0),
            estoque_atual: Number((estoquePorId.get(String(cadastro.codigo_produto)) || 0).toFixed(3)),
            ativo: true,
            ncm: cadastro.ncm || null,
            ean: cadastro.ean || null,
            updated_at: now,
        });
    }

    const rowsUnicos = deduplicarPorProduto(rows);
    const publicados = await publicar(rowsUnicos);
    const out = path.join(__dirname, 'catalogo-publicado-vendidos-com-estoque.json');
    fs.writeFileSync(out, JSON.stringify({
        publicado_em: now,
        origem: sourcePath,
        vendidos_distintos_origem: source.produtos?.length || 0,
        vendidos_validos_catalogo: produtosVendidos.length,
        publicados,
        duplicados_por_codigo_produto: rows.length - rowsUnicos.length,
        sem_cadastro_omie_produtos: semCadastro,
        com_estoque: rowsUnicos.filter(row => row.estoque_atual > 0).length,
        sem_estoque: rowsUnicos.filter(row => row.estoque_atual <= 0).length,
        amostra: rowsUnicos.slice(0, 20),
    }, null, 2));

    console.log(JSON.stringify({
        publicados,
        vendidos_validos_catalogo: produtosVendidos.length,
        duplicados_por_codigo_produto: rows.length - rowsUnicos.length,
        sem_cadastro: semCadastro.length,
        com_estoque: rowsUnicos.filter(row => row.estoque_atual > 0).length,
        sem_estoque: rowsUnicos.filter(row => row.estoque_atual <= 0).length,
        arquivo: out,
    }, null, 2));
}

main().catch(error => {
    console.error(JSON.stringify({ error: error.message }, null, 2));
    process.exit(1);
});
