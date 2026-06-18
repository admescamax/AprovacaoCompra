const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');

const ORDERS_FILE = path.resolve(__dirname, '../data/orders.json');

function readOrders() {
    try {
        const raw = fs.readFileSync(ORDERS_FILE, 'utf8');
        return JSON.parse(raw || '[]');
    } catch {
        return [];
    }
}

// GET /api/orders/stats — agregação por mês (sem filtro de data)
router.get('/stats', authMiddleware, (req, res) => {
    try {
        const orders = readOrders();

        const byMonth = {};
        let totalGeral = 0;
        let totalPedidos = 0;

        for (const order of orders) {
            const mes = order.criadoEm?.slice(0, 7) || 'desconhecido'; // YYYY-MM
            if (!byMonth[mes]) {
                byMonth[mes] = { mes, pedidos: 0, valor: 0, ok: 0, erro: 0 };
            }

            const valorPedido = (order.itens || []).reduce((acc, item) => {
                return acc + (Number(item.quantidade || 0) * Number(item.preco_unitario || 0));
            }, 0);

            const compraOk = order.pedido_compra?.status === 'ok';
            const vendaOk = order.pedido_venda?.status === 'ok';

            byMonth[mes].pedidos += 1;
            byMonth[mes].valor += valorPedido;
            byMonth[mes].ok += (compraOk && vendaOk) ? 1 : 0;
            byMonth[mes].erro += (!compraOk || !vendaOk) ? 1 : 0;

            totalGeral += valorPedido;
            totalPedidos += 1;
        }

        // Ordena por mês crescente
        const meses = Object.values(byMonth).sort((a, b) => a.mes.localeCompare(b.mes));

        res.json({ meses, totalGeral, totalPedidos });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/orders?de=YYYY-MM-DD&ate=YYYY-MM-DD
router.get('/', authMiddleware, (req, res) => {
    try {
        let orders = readOrders();

        const { de, ate } = req.query;
        if (de) {
            const [y, m, d] = de.split('-').map(Number);
            const from = new Date(y, m - 1, d, 0, 0, 0, 0);
            orders = orders.filter(o => new Date(o.criadoEm) >= from);
        }
        if (ate) {
            const [y, m, d] = ate.split('-').map(Number);
            const to = new Date(y, m - 1, d, 23, 59, 59, 999);
            orders = orders.filter(o => new Date(o.criadoEm) <= to);
        }

        // Mais recentes primeiro
        orders.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));

        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
module.exports.ORDERS_FILE = ORDERS_FILE;
module.exports.readOrders = readOrders;
