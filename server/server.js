const dotenv = require('dotenv');
const path = require('path');

// DEVE SER O PRIMEIRO REQUIRE - carrega o .env antes de qualquer outro módulo
dotenv.config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');
const authRoutes = require('./routes/auth');
const partsRoutes = require('./routes/parts');
const checkoutRoutes = require('./routes/checkout');
const ordersRoutes = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url} - IP: ${req.ip}`);
    console.log(`[REQ] ${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/parts', partsRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/orders', ordersRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Final handler para 404
app.use((req, res) => {
    logger.warn(`404 NOT FOUND: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Rota não encontrada no servidor backend', path: req.url });
});

app.listen(PORT, () => {
    const banner = `
=========================================
  ESCAMAX PORTAL SERVER v1.0.5 - ONLINE
  Porta: ${PORT}
  Rotas Checkout Ativas: /api/checkout/*
=========================================`;
    logger.info(banner);
    console.log(banner);
});
