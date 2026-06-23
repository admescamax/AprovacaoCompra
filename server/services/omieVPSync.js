const fetch = require('node-fetch');
const logger = require('../utils/logger');

const OMIE_URL  = 'https://app.omie.com.br/api/v1/geral/produtos/';
const PAGE_SIZE = 50;

const SUPABASE_URL      = process.env.SUPABASE_URL      || 'https://hhgvlcskxopryqvhofsg.supabase.co';
const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_KEY;
const OMIE_VP_APP_KEY   = process.env.OMIE_VP_APP_KEY;
const OMIE_VP_APP_SECRET= process.env.OMIE_VP_APP_SECRET;

async function syncOmieProdutos() {
    if (!OMIE_VP_APP_KEY || !OMIE_VP_APP_SECRET) {
        logger.warn('[omieVPSync] OMIE_VP_APP_KEY / OMIE_VP_APP_SECRET não configurados — sync ignorado.');
        return { ok: false, reason: 'missing_keys' };
    }
    if (!SUPABASE_KEY) {
        logger.warn('[omieVPSync] SUPABASE_SERVICE_KEY não configurada — sync ignorado.');
        return { ok: false, reason: 'missing_supabase_key' };
    }

    let page = 1;
    let totalPages = 1;
    let totalSynced = 0;
    const errors = [];

    logger.info('[omieVPSync] Iniciando sync Omie → Supabase...');

    while (page <= totalPages) {
        let data;
        try {
            const resp = await fetch(OMIE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    call: 'ListarProdutos',
                    app_key: OMIE_VP_APP_KEY,
                    app_secret: OMIE_VP_APP_SECRET,
                    param: [{
                        pagina: page,
                        registros_por_pagina: PAGE_SIZE,
                        apenas_importado_api: 'N',
                        filtrar_apenas_omiepdv: 'N',
                        inativo: 'N'
                    }]
                })
            });
            data = await resp.json();
        } catch (err) {
            errors.push(`Omie fetch error page ${page}: ${err.message}`);
            break;
        }

        if (data.faultstring) {
            errors.push(`Omie fault: ${data.faultstring}`);
            break;
        }

        if (!data.total_de_paginas) {
            errors.push(`Resposta inesperada: ${JSON.stringify(data).slice(0, 200)}`);
            break;
        }

        totalPages = Number(data.total_de_paginas ?? 1);
        const produtos = data.produto_servico_cadastro ?? [];

        if (produtos.length > 0) {
            const rows = produtos.map(p => ({
                codigo_produto:  String(p.codigo_produto),
                descricao:       String(p.descricao ?? ''),
                unidade:         String(p.unidade ?? 'UN'),
                valor_unitario:  Number(p.valor_unitario)     || 0,
                estoque_atual:   Number(p.quantidade_estoque) || 0,
                ativo:           p.inativo !== 'S',
                ncm:             p.ncm  ?? null,
                ean:             p.ean  ?? null,
                updated_at:      new Date().toISOString()
            }));

            try {
                const upsertResp = await fetch(
                    `${SUPABASE_URL}/rest/v1/omie_produtos`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': SUPABASE_KEY,
                            'Authorization': `Bearer ${SUPABASE_KEY}`,
                            'Prefer': 'resolution=merge-duplicates,return=minimal'
                        },
                        body: JSON.stringify(rows)
                    }
                );

                if (!upsertResp.ok) {
                    const txt = await upsertResp.text();
                    errors.push(`Supabase upsert p${page}: ${txt.slice(0, 200)}`);
                } else {
                    totalSynced += rows.length;
                }
            } catch (err) {
                errors.push(`Supabase upsert error p${page}: ${err.message}`);
            }
        }

        page++;
    }

    const result = { ok: errors.length === 0, synced: totalSynced, total_pages: totalPages, errors };
    if (result.ok) {
        logger.info(`[omieVPSync] Sync concluído: ${totalSynced} produtos em ${totalPages} páginas.`);
    } else {
        logger.error(`[omieVPSync] Sync com erros: ${JSON.stringify(errors)}`);
    }
    return result;
}

module.exports = { syncOmieProdutos };
