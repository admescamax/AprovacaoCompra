const { roundMoney, validarPlanoPagamentoSalvo } = require('./paymentPlan');

function criarRegistroContasPagarEscamax({ unidade, pedidoCompra, planoPagamento, totalPedido }) {
    validarPlanoPagamentoSalvo(planoPagamento, totalPedido);

    return {
        status: 'confirmado_por_pedido_compra',
        origem: 'Omie Escamax',
        destino: 'VerticalParts',
        unidade,
        pedidoCompraNumero: pedidoCompra?.numero || null,
        pedidoCompraCodigo: pedidoCompra?.codigo || null,
        pedidoCompraIntegracao: pedidoCompra?.codigo_integracao || null,
        total: roundMoney(totalPedido),
        qtdeParcelas: planoPagamento.qtdeParcelas,
        codigoParcelaOmie: planoPagamento.codigoParcela || '999',
        parcelas: planoPagamento.parcelas.map(parcela => ({
            numero: parcela.numero,
            valor: parcela.valor,
            data: parcela.data,
            dias: parcela.dias,
            percentual: parcela.percentual,
        })),
        criadoEm: new Date().toISOString(),
        observacao: 'Pedido de Compra Escamax criado com parcelas Omie; este é o lastro do contas a pagar para a VerticalParts.',
    };
}

module.exports = {
    criarRegistroContasPagarEscamax,
};
