function roundMoney(value) {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function toDateBR(date) {
    return date.toLocaleDateString('pt-BR');
}

function parseDateLocal(value) {
    if (!value) return null;
    const [year, month, day] = String(value).split('-').map(Number);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day, 12, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function splitAmount(total, parts) {
    const count = Math.max(1, Number(parts || 1));
    const base = Math.floor((total / count) * 100) / 100;
    const values = Array.from({ length: count }, () => base);
    const distributed = roundMoney(base * count);
    values[count - 1] = roundMoney(values[count - 1] + roundMoney(total - distributed));
    return values;
}

function criarParcelas({ total, valorEntrada, dataEntrada, parcelasRestante, dataBase = new Date() }) {
    const parcelas = [];
    let sequencia = 1;
    const totalSeguro = roundMoney(total);
    const entrada = roundMoney(valorEntrada);
    const restante = roundMoney(totalSeguro - entrada);
    const dataInicial = new Date(dataBase);

    if (entrada > 0) {
        parcelas.push({
            numero: sequencia++,
            valor: entrada,
            data: dataEntrada,
            dias: Math.max(0, Math.ceil((dataEntrada - dataInicial) / 86400000)),
        });
    }

    if (restante > 0) {
        const partes = splitAmount(restante, parcelasRestante);
        partes.forEach((valor, index) => {
            const data = addDays(dataInicial, 30 * (index + 1));
            parcelas.push({
                numero: sequencia++,
                valor,
                data,
                dias: 30 * (index + 1),
            });
        });
    }

    return parcelas.map(parcela => ({
        ...parcela,
        percentual: roundMoney((parcela.valor / totalSeguro) * 100),
    }));
}

function normalizarPlanoPagamento(pagamento = {}, totalPedido) {
    const total = roundMoney(totalPedido);
    if (!total || total <= 0) {
        throw new Error('Total do pedido inválido para montar o parcelamento.');
    }

    const valorEntrada = roundMoney(pagamento.valorEntrada || 0);
    const parcelasSolicitadas = Number.isInteger(Number(pagamento.parcelas))
        ? Number(pagamento.parcelas)
        : 1;

    if (valorEntrada < 0) {
        throw new Error('Valor de entrada não pode ser negativo.');
    }
    if (valorEntrada > total) {
        throw new Error('Valor de entrada não pode ser maior que o total do pedido.');
    }
    if (parcelasSolicitadas < 0 || parcelasSolicitadas > 12) {
        throw new Error('Quantidade de parcelas inválida. Use à vista ou de 1 a 12 parcelas.');
    }

    const dataEntrada = parseDateLocal(pagamento.dataEntrada);
    if (valorEntrada > 0 && !dataEntrada) {
        throw new Error('Informe a data da entrada quando houver valor de entrada.');
    }

    const restante = roundMoney(total - valorEntrada);
    const parcelasRestante = restante > 0
        ? Math.max(1, parcelasSolicitadas || 1)
        : 0;

    const parcelas = criarParcelas({
        total,
        valorEntrada,
        dataEntrada,
        parcelasRestante,
    });

    const soma = roundMoney(parcelas.reduce((sum, parcela) => sum + parcela.valor, 0));
    if (soma !== total) {
        throw new Error(`Parcelamento inválido: soma ${soma} diferente do total ${total}.`);
    }

    return {
        versao: 1,
        total,
        valorEntrada,
        restante,
        parcelasRestante,
        qtdeParcelas: parcelas.length,
        codigoParcela: '999',
        parcelas,
        descricao: parcelas.length === 1 && valorEntrada === 0
            ? 'À vista'
            : parcelas.map(parcela => `${parcela.numero}/${parcelas.length}: R$${parcela.valor.toFixed(2)} em ${toDateBR(parcela.data)}`).join(' | '),
        omieVenda: {
            codigo_parcela: '999',
            qtde_parcelas: parcelas.length,
            lista_parcelas: {
                parcela: parcelas.map(parcela => ({
                    numero_parcela: parcela.numero,
                    valor: parcela.valor,
                    percentual: parcela.percentual,
                    data_vencimento: toDateBR(parcela.data),
                    quantidade_dias: parcela.dias,
                    meio_pagamento: process.env.OMIE_MEIO_PAGAMENTO_PADRAO || '15',
                })),
            },
        },
        omieCompra: {
            cCodParc: '999',
            nQtdeParc: parcelas.length,
            parcelas_incluir: parcelas.map(parcela => ({
                nParcela: parcela.numero,
                dVencto: toDateBR(parcela.data),
                nValor: parcela.valor,
                nDias: parcela.dias,
                nPercent: parcela.percentual,
            })),
        },
    };
}

function validarPlanoPagamentoSalvo(planoPagamento, totalPedido) {
    if (!planoPagamento || !Array.isArray(planoPagamento.parcelas) || planoPagamento.parcelas.length === 0) {
        throw new Error('Faturamento bloqueado: pedido sem plano de pagamento salvo.');
    }

    const total = roundMoney(totalPedido ?? planoPagamento.total);
    if (!total || total <= 0) {
        throw new Error('Faturamento bloqueado: total financeiro inválido no plano de pagamento.');
    }

    const soma = roundMoney(planoPagamento.parcelas.reduce((sum, parcela) => sum + Number(parcela.valor || 0), 0));
    if (soma !== total) {
        throw new Error(`Faturamento bloqueado: soma das parcelas (${soma}) diferente do total do pedido (${total}).`);
    }

    const parcelasInvalidas = planoPagamento.parcelas.filter(parcela => {
        return !parcela.numero || Number(parcela.valor || 0) <= 0 || !parcela.data;
    });
    if (parcelasInvalidas.length > 0) {
        throw new Error('Faturamento bloqueado: plano de pagamento possui parcela sem número, valor ou vencimento.');
    }

    if (!planoPagamento.omieVenda?.lista_parcelas || !planoPagamento.omieCompra?.parcelas_incluir) {
        throw new Error('Faturamento bloqueado: plano de pagamento não contém os payloads financeiros da compra e da venda Omie.');
    }

    return true;
}

module.exports = {
    normalizarPlanoPagamento,
    validarPlanoPagamentoSalvo,
    roundMoney,
};
