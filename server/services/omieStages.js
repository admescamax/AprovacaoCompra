const ETAPAS_VENDA_PRODUTO_VP = {
    PEDIDO_VENDA: {
        codigo: process.env.OMIE_VP_ETAPA_PEDIDO || '10',
        label: 'Pedido de Venda',
    },
    SEPARAR_ESTOQUE: {
        codigo: process.env.OMIE_VP_ETAPA_SEPARAR || '20',
        label: 'Separar Estoque / Produção',
    },
    FATURAR: {
        codigo: process.env.OMIE_VP_ETAPA_FATURAR || '50',
        label: 'Faturar',
    },
    FATURADO: {
        codigo: process.env.OMIE_VP_ETAPA_FATURADO || '60',
        label: 'Faturado',
    },
    ENTREGA: {
        codigo: process.env.OMIE_VP_ETAPA_ENTREGA || '70',
        label: 'Entrega',
    },
    CONCLUIDO: {
        codigo: process.env.OMIE_VP_ETAPA_CONCLUIDO || '80',
        label: 'Pedido de Venda',
    },
};

function etapaVendaProdutoVP(chave) {
    const etapa = ETAPAS_VENDA_PRODUTO_VP[chave];
    if (!etapa) throw new Error(`Etapa VP desconhecida: ${chave}`);
    return etapa;
}

function registrarSincronizacaoEtapa(order, { origem, etapaLocal, etapaOmie, resultado = null }) {
    return {
        ...(order || {}),
        pedido_venda: {
            ...(order?.pedido_venda || {}),
            etapa: etapaOmie.codigo,
            etapa_label: etapaOmie.label,
            etapa_local: etapaLocal || null,
            etapa_sincronizada_em: new Date().toISOString(),
        },
        sincronizacoes_omie: [
            ...(order?.sincronizacoes_omie || []),
            {
                origem,
                entidade: 'pedido_venda_vp',
                etapaLocal: etapaLocal || null,
                etapaOmie: etapaOmie.codigo,
                etapaOmieLabel: etapaOmie.label,
                resultado,
                criadoEm: new Date().toISOString(),
            },
        ],
    };
}

function registrarErroSincronizacaoEtapa(order, { origem, etapaLocal, etapaOmie, error }) {
    const detalhe = error?.response?.data?.faultstring || error?.response?.data?.message || error?.message || 'Falha ao sincronizar etapa no Omie.';
    return {
        ...(order || {}),
        pedido_venda: {
            ...(order?.pedido_venda || {}),
            etapa_sync_status: 'erro',
            etapa_sync_detalhe: detalhe,
            etapa_sync_erro_em: new Date().toISOString(),
        },
        sincronizacoes_omie: [
            ...(order?.sincronizacoes_omie || []),
            {
                origem,
                entidade: 'pedido_venda_vp',
                etapaLocal: etapaLocal || null,
                etapaOmie: etapaOmie?.codigo || null,
                etapaOmieLabel: etapaOmie?.label || null,
                status: 'erro',
                detalhe,
                criadoEm: new Date().toISOString(),
            },
        ],
    };
}

module.exports = {
    ETAPAS_VENDA_PRODUTO_VP,
    etapaVendaProdutoVP,
    registrarSincronizacaoEtapa,
    registrarErroSincronizacaoEtapa,
};
