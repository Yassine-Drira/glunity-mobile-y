'use strict';

require('dotenv').config();

const nodemailer = require('nodemailer');

async function run() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const mailFrom = process.env.MAIL_FROM || user;
  const mailTo = process.env.SMTP_TEST_TO || user;

  if (!user || !pass) {
    console.error('[smtp-test] Missing SMTP_USER or SMTP_PASS in environment.');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  console.log(`[smtp-test] Verifying SMTP connection to ${host}:${port} ...`);
  await transporter.verify();
  console.log('[smtp-test] SMTP verification successful.');

  const info = await transporter.sendMail({
    from: mailFrom,
    to: mailTo,
    subject: 'GlUnity SMTP auth test',
    text: 'If you received this email, SMTP auth is configured correctly.',
    html: '<p>If you received this email, SMTP auth is configured correctly.</p>',
  });

  console.log(`[smtp-test] Test mail sent. messageId=${info.messageId}`);
}

run().catch((err) => {
  console.error('[smtp-test] Failed:', err.message);
  process.exit(1);
});
