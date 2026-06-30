const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const serverRequire = createRequire(path.join(__dirname, '..', 'server', 'server.js'));
const fetch = serverRequire('node-fetch');

serverRequire('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const KEY = process.env.OMIE_VP_APP_KEY || process.env.OMIE_APP_KEY;
const SECRET = process.env.OMIE_VP_APP_SECRET || process.env.OMIE_APP_SECRET;
const CATEGORIA_VENDAS_PECAS = '1.01.01';
const TAG_EMPRESA_MANUTENCAO = 'empresa de manutencao';
const DATA_DE = '01/01/2025';
const DATA_ATE = '30/06/2026';

const norm = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

async function omie(endpoint, call, param, tries = 3) {
    let lastError;
    for (let attempt = 1; attempt <= tries; attempt++) {
        try {
            const resp = await fetch(`https://app.omie.com.br/api/v1/${endpoint}/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ call, app_key: KEY, app_secret: SECRET, param: [param] }),
            });
            const data = await resp.json();
            if (data.faultstring) throw new Error(data.faultstring);
            return data;
        } catch (error) {
            lastError = error;
            const redundant = /Aguarde\s+(\d+)\s+segundos/i.exec(error.message);
            const waitMs = redundant ? (Number(redundant[1]) + 2) * 1000 : 700 * attempt;
            await new Promise(resolve => setTimeout(resolve, waitMs));
        }
    }
    throw new Error(`${call}: ${lastError.message}`);
}

async function listarClientesEmpresaManutencao() {
    const first = await omie('geral/clientes', 'ListarClientes', {
        pagina: 1,
        registros_por_pagina: 100,
        apenas_importado_api: 'N',
    });

    const totalPages = Number(first.total_de_paginas || 1);
    const clientes = [];

    for (let page = 1; page <= totalPages; page++) {
        const data = page === 1 ? first : await omie('geral/clientes', 'ListarClientes', {
            pagina: page,
            registros_por_pagina: 100,
            apenas_importado_api: 'N',
        });

        for (const cliente of data.clientes_cadastro || []) {
            const tags = (cliente.tags || []).map(tag => String(tag.tag || tag || '').trim()).filter(Boolean);
            const temTag = tags.some(tag => norm(tag) === TAG_EMPRESA_MANUTENCAO);
            if (temTag && cliente.inativo !== 'S') {
                clientes.push({
                    codigo_cliente_omie: cliente.codigo_cliente_omie,
                    razao_social: cliente.razao_social,
                    nome_fantasia: cliente.nome_fantasia,
                    estado: cliente.estado,
                    cidade: cliente.cidade,
                });
            }
        }

        if (page % 20 === 0 || page === totalPages) {
            console.error(`[clientes] paginas ${page}/${totalPages}; encontrados ${clientes.length}`);
        }
    }

    return clientes;
}

async function listarPedidosFaturadosPeriodo() {
    const pedidos = [];
    let page = 1;
    let totalPages = 1;

    do {
        const data = await omie('produtos/pedido', 'ListarPedidos', {
            pagina: page,
            registros_por_pagina: 100,
            data_faturamento_de: DATA_DE,
            data_faturamento_ate: DATA_ATE,
            status_pedido: 'FATURADO',
            apenas_resumo: 'N',
        });

        totalPages = Number(data.total_de_paginas || 1);
        pedidos.push(...(data.pedido_venda_produto || []));
        if (page % 10 === 0 || page === totalPages) {
            console.error(`[pedidos] paginas ${page}/${totalPages}; pedidos lidos ${pedidos.length}`);
        }
        page++;
    } while (page <= totalPages);

    return pedidos;
}

function extrairCodigoProduto(item) {
    return String(
        item?.ide?.codigo_item_integracao ||
        item?.produto?.codigo ||
        item?.produto?.codigo_produto ||
        ''
    ).trim();
}

function agregarPedido(agregado, pedido, cliente) {
    const categoria = pedido?.informacoes_adicionais?.codigo_categoria;
    if (categoria !== CATEGORIA_VENDAS_PECAS) return false;

    const numeroPedido = pedido?.cabecalho?.numero_pedido || pedido?.cabecalho?.codigo_pedido || '';
    const dataFaturamento = pedido?.cabecalho?.data_faturamento || pedido?.cabecalho?.data_previsao || '';

    for (const item of pedido.det || []) {
        const produto = item.produto || {};
        const codigo = extrairCodigoProduto(item);
        const descricao = String(produto.descricao || '').trim();
        const key = `${codigo}|${descricao}`;
        const quantidade = Number(produto.quantidade || 0);
        const valorUnitario = Number(produto.valor_unitario || 0);
        const valorTotal = Number(produto.valor_total || produto.valor_mercadoria || quantidade * valorUnitario || 0);

        if (!agregado.produtos.has(key)) {
            agregado.produtos.set(key, {
                codigo,
                descricao,
                quantidade_total: 0,
                valor_total: 0,
                pedidos: new Set(),
                clientes: new Set(),
                ultimo_valor_unitario: valorUnitario,
            });
        }

        const row = agregado.produtos.get(key);
        row.quantidade_total += quantidade;
        row.valor_total += valorTotal;
        row.ultimo_valor_unitario = valorUnitario || row.ultimo_valor_unitario;
        row.pedidos.add(String(numeroPedido));
        row.clientes.add(String(cliente.codigo_cliente_omie));

        agregado.itens.push({
            numero_pedido: numeroPedido,
            data_faturamento: dataFaturamento,
            codigo_cliente_omie: cliente.codigo_cliente_omie,
            cliente: cliente.nome_fantasia || cliente.razao_social,
            codigo,
            descricao,
            quantidade,
            valor_unitario: valorUnitario,
            valor_total: valorTotal,
        });
    }

    return true;
}

async function main() {
    if (!KEY || !SECRET) throw new Error('Credenciais Omie VP não configuradas.');

    const clientes = await listarClientesEmpresaManutencao();
    const clientesPorCodigo = new Map(clientes.map(cliente => [Number(cliente.codigo_cliente_omie), cliente]));
    const pedidosPeriodo = await listarPedidosFaturadosPeriodo();
    const agregado = {
        clientes_lidos_com_tag: clientes.length,
        pedidos_faturados_lidos: 0,
        pedidos_categoria_vendas_pecas: 0,
        produtos: new Map(),
        itens: [],
    };

    for (const pedido of pedidosPeriodo) {
        const codigoCliente = Number(pedido?.cabecalho?.codigo_cliente);
        const cliente = clientesPorCodigo.get(codigoCliente);
        if (!cliente) continue;

        agregado.pedidos_faturados_lidos++;
        if (agregarPedido(agregado, pedido, cliente)) {
            agregado.pedidos_categoria_vendas_pecas++;
        }
    }

    /*
    for (let index = 0; index < clientes.length; index++) {
        const cliente = clientes[index];
        const pedidos = await listarPedidosFaturadosPorCliente(cliente.codigo_cliente_omie);
        agregado.pedidos_faturados_lidos += pedidos.length;

        for (const pedido of pedidos) {
            if (agregarPedido(agregado, pedido, cliente)) {
                agregado.pedidos_categoria_vendas_pecas++;
            }
        }

        if ((index + 1) % 10 === 0 || index + 1 === clientes.length) {
            console.error(`[pedidos] clientes ${index + 1}/${clientes.length}; pedidos ${agregado.pedidos_faturados_lidos}; produtos ${agregado.produtos.size}`);
        }
    }
    */

    const produtos = [...agregado.produtos.values()]
        .map(row => ({
            ...row,
            pedidos: row.pedidos.size,
            clientes: row.clientes.size,
            quantidade_total: Number(row.quantidade_total.toFixed(4)),
            valor_total: Number(row.valor_total.toFixed(2)),
        }))
        .sort((a, b) => b.valor_total - a.valor_total);

    const resultado = {
        periodo: { de: DATA_DE, ate: DATA_ATE },
        filtro_cliente_tag: 'Empresa de Manutenção',
        filtro_categoria: { codigo: CATEGORIA_VENDAS_PECAS, descricao: 'Vendas de Peças' },
        resumo: {
            clientes_ativos_com_tag: agregado.clientes_lidos_com_tag,
            pedidos_faturados_lidos_desses_clientes: agregado.pedidos_faturados_lidos,
            pedidos_faturados_categoria_vendas_pecas: agregado.pedidos_categoria_vendas_pecas,
            produtos_distintos_vendidos: produtos.length,
            itens_vendidos_linhas: agregado.itens.length,
            valor_total_vendido: Number(agregado.itens.reduce((sum, item) => sum + item.valor_total, 0).toFixed(2)),
        },
        produtos,
        top_30_por_valor: produtos.slice(0, 30),
    };

    const out = path.join(__dirname, 'vendas-pecas-empresa-manutencao-2025-2026.json');
    fs.writeFileSync(out, JSON.stringify(resultado, null, 2));
    console.log(JSON.stringify({ arquivo: out, resumo: resultado.resumo, top_10_por_valor: resultado.top_30_por_valor.slice(0, 10) }, null, 2));
}

main().catch(error => {
    console.error(JSON.stringify({ error: error.message }, null, 2));
    process.exit(1);
});
