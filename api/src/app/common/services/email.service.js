'use strict';

const nodemailer = require('nodemailer');
const env        = require('../../config/env');
const logger     = require('../../bootstrap/logger.bootstrap');

// ── Transporter (lazy-init) ───────────────────────────────────────────────────
let _transporter = null;

function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host:   env.SMTP_HOST,
      port:   Number(env.SMTP_PORT),
      secure: Number(env.SMTP_PORT) === 465, // true for 465, false for 587
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return _transporter;
}

// ── Send helper ───────────────────────────────────────────────────────────────
async function sendMail({ to, subject, html, text }) {
  const transporter = getTransporter();
  const info = await transporter.sendMail({
    from:    env.MAIL_FROM || `"GlUnity" <${env.SMTP_USER}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''),
  });
  logger.info(`Email sent: ${info.messageId} → ${to}`);
  return info;
}

// ── Templates ─────────────────────────────────────────────────────────────────
async function sendPasswordResetEmail(email, resetUrl) {
  return sendMail({
    to:      email,
    subject: 'Reset your GlUnity password',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#8BC34A">GlUnity — Reset Your Password</h2>
        <p>Click the button below to reset your password. This link expires in <strong>15 minutes</strong>.</p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:12px 28px;background:#8BC34A;color:#fff;
                  border-radius:8px;text-decoration:none;font-weight:700;margin:20px 0">
          Reset Password
        </a>
        <p style="color:#999;font-size:13px">If you didn't request a password reset, you can safely ignore this email.</p>
        <p style="color:#999;font-size:13px">Link: ${resetUrl}</p>
      </div>
    `,
  });
}

async function sendVerificationEmail(email, verifyUrl) {
  return sendMail({
    to:      email,
    subject: 'Verify your GlUnity account',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#8BC34A">GlUnity — Verify Your Email</h2>
        <p>Welcome! Please click the button below to verify your email address.</p>
        <a href="${verifyUrl}"
           style="display:inline-block;padding:12px 28px;background:#8BC34A;color:#fff;
                  border-radius:8px;text-decoration:none;font-weight:700;margin:20px 0">
          Verify Email
        </a>
        <p style="color:#999;font-size:13px">This link expires in <strong>24 hours</strong>.</p>
        <p style="color:#999;font-size:13px">Link: ${verifyUrl}</p>
      </div>
    `,
  });
}

async function sendTwoFactorEmail(email, code) {
  return sendMail({
    to:      email,
    subject: 'GlUnity — Two-Factor Verification Code',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#8BC34A">GlUnity — Security Code</h2>
        <p>Your two-factor authentication verification code is:</p>
        <div style="font-size:32px;font-weight:bold;color:#333;letter-spacing:6px;margin:20px 0;text-align:center;padding:12px;background:#f5f5f5;border-radius:8px">
          ${code}
        </div>
        <p style="color:#999;font-size:13px">This code expires in <strong>5 minutes</strong>.</p>
        <p style="color:#999;font-size:13px">If you did not request this code, you can safely ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendMail, sendPasswordResetEmail, sendVerificationEmail, sendTwoFactorEmail };
