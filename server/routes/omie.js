const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { consultarPedidoVenda } = require('../services/omieClient');
const logger = require('../utils/logger');

const UNIDADES_VALIDAS = ['BRASILIA', 'FLORIANOPOLIS', 'PICARRAS', 'SALVADOR', 'SAOPAULO'];

// GET /api/omie/pedido-venda?numero=12345&unidade=SAOPAULO
router.get('/pedido-venda', authMiddleware, async (req, res) => {
    const { numero, unidade } = req.query;

    if (!numero || !unidade) {
        return res.status(400).json({ error: 'Parâmetros numero e unidade são obrigatórios' });
    }

    const unidadeUp = unidade.toUpperCase();
    if (!UNIDADES_VALIDAS.includes(unidadeUp)) {
        return res.status(400).json({ error: `Unidade inválida: ${unidade}` });
    }

    logger.info(`[omie/pedido-venda] Consultando pedido ${numero} na filial ${unidadeUp}`);

    try {
        const resultado = await consultarPedidoVenda(numero, unidadeUp);

        if (!resultado) {
            return res.status(404).json({
                error: `Pedido de venda nº ${numero} não encontrado na filial ${unidadeUp}`,
            });
        }

        return res.json({
            valido: true,
            numero: resultado.numero,
            vendedor: resultado.vendedor,
        });
    } catch (err) {
        logger.error(`[omie/pedido-venda] Erro: ${err.message}`);
        return res.status(500).json({ error: `Erro ao consultar pedido no Omie: ${err.message}` });
    }
});

module.exports = router;
