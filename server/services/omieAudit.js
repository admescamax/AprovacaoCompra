const { roundMoney } = require('./paymentPlan');

function extrairTotalCompra(response) {
    const candidatos = [
        response?.totais?.nValorTotal,
        response?.total_pedido?.valor_total_pedido,
        response?.cabecalho?.nValorTotal,
        response?.nValorTotal,
    ];
    return roundMoney(candidatos.find(value => Number(value) > 0) || 0);
}

function extrairTotalVenda(response) {
    const total = response?.pedido_venda_produto?.total_pedido || response?.total_pedido || {};
    return roundMoney(
        total.valor_total_pedido ||
        total.valor_total ||
        total.valor_mercadorias ||
        total.nValorTotal ||
        0
    );
}

function extrairEtapaVenda(response) {
    return response?.pedido_venda_produto?.cabecalho?.etapa || response?.cabecalho?.etapa || null;
}

function extrairQuantidadeParcelasCompra(response) {
    const parcelas = response?.parcelas || response?.parcelas_consultar || response?.parcelas_incluir || [];
    if (Array.isArray(parcelas)) return parcelas.length;
    return Number(response?.cabecalho?.nQtdeParc || response?.nQtdeParc || 0) || 0;
}

function extrairQuantidadeParcelasVenda(response) {
    const parcelas = response?.pedido_venda_produto?.lista_parcelas?.parcela || response?.lista_parcelas?.parcela || [];
    if (Array.isArray(parcelas)) return parcelas.length;
    return Number(response?.pedido_venda_produto?.cabecalho?.qtde_parcelas || response?.cabecalho?.qtde_parcelas || 0) || 0;
}

function montarAuditoriaOmie({ order, consultaCompra, consultaVenda }) {
    const totalEsperado = roundMoney(order?.planoPagamento?.total || 0);
    const parcelasEsperadas = Number(order?.planoPagamento?.qtdeParcelas || 0);
    const totalCompra = extrairTotalCompra(consultaCompra);
    const totalVenda = extrairTotalVenda(consultaVenda);
    const parcelasCompra = extrairQuantidadeParcelasCompra(consultaCompra);
    const parcelasVenda = extrairQuantidadeParcelasVenda(consultaVenda);

    return {
        status: 'verificado',
        verificadoEm: new Date().toISOString(),
        compraEscamax: {
            existe: Boolean(consultaCompra),
            numero: order?.pedido_compra?.numero || null,
            total: totalCompra || null,
            parcelas: parcelasCompra || null,
            totalConfere: totalCompra ? totalCompra === totalEsperado : null,
            parcelasConferem: parcelasCompra ? parcelasCompra === parcelasEsperadas : null,
        },
        vendaVerticalParts: {
            existe: Boolean(consultaVenda),
            numero: order?.pedido_venda?.numero || null,
            total: totalVenda || null,
            parcelas: parcelasVenda || null,
            etapa: extrairEtapaVenda(consultaVenda),
            totalConfere: totalVenda ? totalVenda === totalEsperado : null,
            parcelasConferem: parcelasVenda ? parcelasVenda === parcelasEsperadas : null,
        },
        esperado: {
            total: totalEsperado,
            parcelas: parcelasEsperadas,
        },
    };
}

function montarAuditoriaErro(error) {
    return {
        status: 'erro_verificacao',
        verificadoEm: new Date().toISOString(),
        detalhe: error?.response?.data?.faultstring || error?.response?.data?.message || error?.message || 'Falha ao auditar pedidos no Omie.',
    };
}

module.exports = {
    montarAuditoriaOmie,
    montarAuditoriaErro,
};
