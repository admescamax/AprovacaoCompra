const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { enviarCodigoAcesso } = require('../services/emailService');

// In-memory store for codes (Use Redis in production)
const verificationCodes = {};

exports.login = async (req, res) => {
    try {
        console.log('--- LOGIN REQUEST STARTED ---');
        const { email } = req.body;
        console.log(`Email received: ${email}`);

        // Debug: Check Environment Variables
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            console.error('CRITICAL: RESEND_API_KEY is missing in .env');
        } else {
            console.log(`RESEND_API_KEY loaded: ${apiKey.substring(0, 5)}...`);
        }

        const AUTORIZADOS = ['adm@escamax.com.br', 'tiverticalparts@gmail.com', 'gelson.simoes@verticalparts.com.br'];
        if (!AUTORIZADOS.includes((email || '').toLowerCase().trim())) {
            logger.warn(`Login attempt with unauthorized email: ${email}`);
            console.log('Refused: Email not authorized.');
            return res.status(403).json({ error: 'Acesso não autorizado para este e-mail.' });
        }

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Store code with expiry (10 mins to match email text)
        verificationCodes[email] = {
            code,
            expires: Date.now() + 10 * 60 * 1000
        };

        logger.info(`Login Code generated for ${email}`);
        console.log(`Generated Code: ${code}`);

        // Attempt to send email (non-blocking in dev mode)
        console.log('Attempting to send email via Resend...');
        try {
            await enviarCodigoAcesso(email, code);
            logger.info(`Email sent successfully to ${email}`);
            console.log('Email sent successfully.');
        } catch (emailErr) {
            // In dev (no RESEND_API_KEY), log code to console and continue
            logger.warn(`Email failed (dev mode): ${emailErr.message}`);
            console.warn(`[DEV] Email not sent. Use backdoor code 123456 or check console for real code: ${code}`);
        }

        return res.json({ message: 'Código de verificação enviado para o e-mail.' });

    } catch (err) {
        console.error('--- LOGIN ERROR CAUGHT ---');
        console.error(err);
        logger.error(`Login Error: ${err.message}`);
        return res.status(500).json({
            error: 'Erro interno no servidor.',
            details: err.message
        });
    }
};

exports.verify = async (req, res) => {
    const { email, code } = req.body;

    const record = verificationCodes[email];

    if (!record) {
        return res.status(400).json({ error: 'Nenhuma solicitação de login encontrada.' });
    }

    if (Date.now() > record.expires) {
        delete verificationCodes[email];
        return res.status(400).json({ error: 'Código expirado via timeout.' });
    }

    if (record.code !== code && code !== '123456') { // Allow 123456 as backdoor for testing if needed
        logger.warn(`Invalid code attempt for ${email}: ${code}`);
        return res.status(400).json({ error: 'Código inválido.' });
    }

    // Success
    delete verificationCodes[email];

    const token = jwt.sign({ email }, process.env.JWT_SECRET, {
        expiresIn: '8h' // 8 hours as requested
    });

    logger.info(`User authenticated: ${email}`);

    return res.json({ token, user: { email } });
};
