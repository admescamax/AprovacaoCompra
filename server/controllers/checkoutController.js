const omieClient = require('../services/omieClient');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const ORDERS_FILE = path.resolve(__dirname, '../data/orders.json');

// Mapeamento de CNPJ por filial (lidos do .env, sem formatação)
const CNPJ_FILIAIS = () => ({
    PICARRAS:      (process.env.CNPJ_PICARRAS || '').replace(/\D/g, ''),
    BRASILIA:      (process.env.CNPJ_BRASILIA || '').replace(/\D/g, ''),
    SAOPAULO:      (process.env.CNPJ_SAOPAULO || '').replace(/\D/g, ''),
    FLORIANOPOLIS: (process.env.CNPJ_FLORIANOPOLIS || '').replace(/\D/g, ''),
    SALVADOR:      (process.env.CNPJ_SALVADOR || '').replace(/\D/g, ''),
});

function saveOrder(entry) {
    try {
        let orders = [];
        try {
            const raw = fs.readFileSync(ORDERS_FILE, 'utf8');
            orders = JSON.parse(raw || '[]');
        } catch { /* arquivo ainda não existe */ }
        orders.push(entry);
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
    } catch (e) {
        logger.error(`Erro ao salvar pedido no histórico: ${e.message}`);
    }
}

exports.processar = async (req, res) => {
    logger.info(`API: Recebida requisição de checkout: ${JSON.stringify(req.body)}`);
    const { unidade, itens, finalidade, tipoFrete, prioridade, pagamento, enderecoEntrega, transportadora } = req.body;

    if (!unidade || !itens || itens.length === 0) {
        return res.status(400).json({ error: 'Unidade e itens são obrigatórios' });
    }

    // Monta texto de observações para enviar ao Omie
    const pagamentoDesc = pagamento
        ? [
            pagamento.valorEntrada > 0 ? `Entrada: R$${pagamento.valorEntrada.toFixed(2)}${pagamento.dataEntrada ? ` em ${new Date(pagamento.dataEntrada + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}` : null,
            pagamento.parcelas > 1 ? `Restante: ${pagamento.parcelas}x` : pagamento.parcelas === 0 ? 'À vista' : null
        ].filter(Boolean).join(' | ')
        : null;

    // Descrição do frete conforme tipo selecionado
    let freteDesc = null;
    if (tipoFrete === '0' && enderecoEntrega) {
        freteDesc = `Frete CIF (VP entrega) — Endereço: ${enderecoEntrega}`;
    } else if (tipoFrete === '2' && transportadora) {
        const parts = ['Frete Transportadora coleta na VP'];
        if (transportadora.razaoSocial) parts.push(`Razão Social: ${transportadora.razaoSocial}`);
        if (transportadora.cnpj) parts.push(`CNPJ: ${transportadora.cnpj}`);
        freteDesc = parts.join(' — ');
    }

    const observacoes = [
        finalidade ? `Finalidade: ${finalidade}` : null,
        prioridade ? `Prioridade: ${prioridade}` : null,
        freteDesc || null,
        pagamentoDesc || null,
    ].filter(Boolean).join(' | ');

    const orderEntry = {
        id: `ESC-${Date.now()}`,
        criadoEm: new Date().toISOString(),
        unidade,
        itens,
        finalidade: finalidade || null,
        tipoFrete: tipoFrete || '9',
        prioridade: prioridade || null,
        pagamento: pagamento || null,
        pedido_compra: { numero: null, status: 'pendente', detalhe: null },
        pedido_venda: { numero: null, status: 'pendente', detalhe: null },
    };

    try {
        const cleanCnpjVP = (process.env.CNPJ_VP || '15.822.325/0001-27').replace(/\D/g, '');
        const cleanCnpjEscamax = CNPJ_FILIAIS()[unidade] || null;

        if (!cleanCnpjEscamax) {
            return res.status(400).json({ error: `Unidade "${unidade}" não configurada. Verifique o CNPJ no .env.` });
        }

        logger.info(`Iniciando Checkout B2B: ${unidade} -> VerticalParts (CNPJs limpos)`);

        // 1. Criar Requisição de Compra na Escamax
        let idCompra = null;
        let nCodPedCompra = null;
        try {
            const resCompra = await omieClient.incluirRequisicaoCompra({
                unidade,
                cnpjFornecedor: cleanCnpjVP,
                itens,
                tipoFrete: tipoFrete || '9',
                observacoes,
                finalidade: finalidade || 'Revenda'
            });
            idCompra = resCompra.cNumero || resCompra.nCodPed;
            nCodPedCompra = resCompra.nCodPed || null;
            logger.info(`Requisição de Compra criada na ${unidade}: ${idCompra} (ID: ${nCodPedCompra})`);
            orderEntry.pedido_compra = { numero: idCompra, status: 'ok', detalhe: null };
        } catch (errCompra) {
            const detalhe = errCompra.response?.data?.faultstring || errCompra.message;
            orderEntry.pedido_compra = { numero: null, status: 'erro', detalhe };
            // Salva parcial e retorna erro
            saveOrder(orderEntry);
            throw errCompra;
        }

        // 2. Criar Pedido de Venda na VerticalParts
        let idVenda = null;
        let valorIpi = 0;
        try {
            const resVenda = await omieClient.incluirPedidoVenda({
                cnpjCliente: cleanCnpjEscamax,
                itens,
                numeroPedidoCliente: idCompra,
                observacoes
            });
            idVenda = resVenda.numero_pedido || resVenda.codigo_pedido_omie;
            valorIpi = resVenda.valorIpi || 0;
            logger.info(`Pedido de Venda criado na VerticalParts: ${idVenda} | IPI: R$${valorIpi.toFixed(2)}`);
            orderEntry.pedido_venda = { numero: idVenda, status: 'ok', detalhe: null };
        } catch (errVenda) {
            const detalhe = errVenda.response?.data?.faultstring || errVenda.message;
            orderEntry.pedido_venda = { numero: null, status: 'erro', detalhe };
            saveOrder(orderEntry);
            throw errVenda;
        }

        // 3. Se há IPI na Proposta Comercial, atualizar o Pedido de Compra com esse valor
        if (valorIpi > 0 && nCodPedCompra) {
            try {
                await omieClient.atualizarDespesasPedidoCompra({ unidade, nCodPed: nCodPedCompra, nValDesp: valorIpi });
                logger.info(`IPI R$${valorIpi.toFixed(2)} adicionado ao Pedido de Compra ${idCompra}`);
            } catch (e) {
                logger.warn(`Não foi possível atualizar IPI no Pedido de Compra: ${e.message}`);
            }
        }

        // Tudo OK — persiste
        saveOrder(orderEntry);

        return res.json({
            message: 'Pedidos criados com sucesso!',
            pedido_compra: idCompra,
            pedido_venda: idVenda
        });

    } catch (error) {
        logger.error(`Erro no processarCheckout: ${error.message}`);
        if (error.response?.data) {
            logger.error(`Detalhe Omie: ${JSON.stringify(error.response.data)}`);
        }
        res.status(500).json({
            error: 'Erro ao processar integração B2B entre as contas Omie.',
            detail: error.message,
            omieDetail: error.response?.data,
            failedUrl: error.config?.url
        });
    }
};

exports.diagnosticar = async (req, res) => {
    const { unidade } = req.query;
    if (!unidade) return res.status(400).json({ error: 'Unidade é obrigatória' });

    try {
        const cleanCnpjVP = (process.env.CNPJ_VP || '15.822.325/0001-27').replace(/\D/g, '');
        const cleanCnpjEscamax = CNPJ_FILIAIS()[unidade] || null;

        const results = {
            unidade,
            vp_fornecedor_na_filial: null,
            filial_cliente_na_vp: null,
            api_status: {}
        };

        // 1. Verificar VP na Filial
        try {
            const f = await omieClient.consultarFornecedor(cleanCnpjVP, unidade);
            results.vp_fornecedor_na_filial = f ? `SIM (Cód: ${f.codigo_fornecedor_omie})` : 'NÃO ENCONTRADO (VerticalParts precisa ser cadastrada como Fornecedor na Filial)';
        } catch (e) { results.api_status.filial = e.message; }

        // 2. Verificar Filial na VP
        try {
            const c = await omieClient.consultarCliente(cleanCnpjEscamax, 'VP');
            results.filial_cliente_na_vp = c ? `SIM (Cód: ${c.codigo_cliente_omie})` : 'NÃO ENCONTRADO (Filial precisa ser cadastrada como Cliente na VerticalParts)';
        } catch (e) { results.api_status.vp = e.message; }

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
