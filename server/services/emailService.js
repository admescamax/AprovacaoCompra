const { Resend } = require('resend');
const path = require('path');

// Garante que .env seja carregado mesmo que emailService seja importado antes do dotenv rodar em server.js
const dotenv = require('dotenv');
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Em modo de desenvolvimento sem domínio verificado no Resend,
// os emails só podem ser enviados para o email do dono da conta.
// Defina DEV_EMAIL_OVERRIDE no .env para redirecionar todos os emails durante testes.
const DEV_EMAIL_OVERRIDE = process.env.DEV_EMAIL_OVERRIDE || null;

const enviarCodigoAcesso = async (email, codigo) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        const errMsg = `[emailService] RESEND_API_KEY está vazia! Tentando ler .env de: ${envPath}`;
        console.error(errMsg);
        throw new Error(errMsg);
    }

    const resend = new Resend(apiKey);

    // Redireciona para o email de dev se o domínio não estiver verificado ainda
    const destinatario = DEV_EMAIL_OVERRIDE || email;
    if (DEV_EMAIL_OVERRIDE) {
        console.warn(`[emailService] DEV MODE: email redirecionado de ${email} para ${destinatario}. Código: ${codigo}`);
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'Portal Escamax <onboarding@resend.dev>',
            to: destinatario,
            subject: `[DEV - para: ${email}] Seu Código de Acesso - Portal de Peças VP`,
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            ${DEV_EMAIL_OVERRIDE ? `<div style="background:#fef3c7;border:1px solid #f59e0b;padding:8px 12px;border-radius:6px;margin-bottom:16px;font-size:13px;color:#92400e;">⚠️ <strong>Modo Dev:</strong> Email originalmente destinado a <code>${email}</code></div>` : ''}
            <h1 style="color: #0f172a;">Acesso ao Portal VerticalParts</h1>
            <p style="color: #475569;">Olá, ADM Escamax. Seu código de verificação é:</p>
            <h2 style="color: #2563eb; letter-spacing: 5px; font-size: 32px; background: #f1f5f9; padding: 10px; border-radius: 8px; display: inline-block;">${codigo}</h2>
            <p style="color: #64748b;">Este código expira em 10 minutos.</p>
        </div>
        `
        });

        if (error) {
            throw new Error(JSON.stringify(error));
        }

        return data;
    } catch (error) {
        const detail = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error('[emailService] Erro Resend Crítico:', detail);
        if (error.stack) console.error(error.stack);
        throw error;
    }
};

module.exports = { enviarCodigoAcesso };
