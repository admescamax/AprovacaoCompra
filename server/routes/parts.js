const express = require('express');
const router = express.Router();
const partsController = require('../controllers/partsController');
const authMiddleware = require('../middleware/authMiddleware');

// Protege todas as rotas
router.use(authMiddleware);

router.get('/listar', partsController.listar);
router.get('/search', partsController.search);

module.exports = router;
