const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { syncOmieProdutos } = require('../services/omieVPSync');

// POST /api/produtos-vp/sync — dispara sync manual (requer auth)
router.post('/sync', authMiddleware, async (req, res) => {
    const result = await syncOmieProdutos();
    res.status(result.ok ? 200 : 207).json(result);
});

module.exports = router;
