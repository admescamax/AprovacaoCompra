const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/test', (req, res) => res.json({ ok: true, message: 'Checkout route is alive' }));
router.get('/diag', authMiddleware, checkoutController.diagnosticar);
router.post('/preflight', authMiddleware, checkoutController.preflight);
router.post('/processar', authMiddleware, checkoutController.processar);

module.exports = router;
