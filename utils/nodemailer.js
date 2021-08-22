const nodemailer = require('nodemailer');

const templateVerifikasi = require('../functions/template-verifikasi-email');
const templateReset = require('../functions/template-reset-password');

const isSecure = process.env.NODEMAILER_ISSECURE === 'true' ? true : false;

const transporter = nodemailer.createTransport({
  host: process.env.NODEMAILER_HOST,
  port: process.env.NODEMAILER_PORT,
  secure: isSecure, // jika true pake SSL, jika false pake TLS/STARTTLS
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD,
  },
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized: false,
  },
});

const sendEmailVerificationLink = (req, email, token) => {
  return transporter.sendMail({// kirimkan token yang ketemu tadi
    to: email,
    from: process.env.NODEMAILER_EMAIL,
    subject: 'Verifikasi Email',
    html: templateVerifikasi(req, token),
  });
};

const sendResetPasswordLink = (req, email, token) => {
  return transporter.sendMail({
    to: email,
    from: process.env.NODEMAILER_EMAIL,
    subject: 'Reset Password',
    html: templateReset(req, token),
  });
};

module.exports = {
  transporter,
  sendEmailVerificationLink,
  sendResetPasswordLink,
};
