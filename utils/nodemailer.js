const nodemailer = require('nodemailer');

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
    html: `
        <h3>Klik link di bawah ini untuk verifikasi email anda</h3>
        <p><a href="${req.address}/verifikasi-email/${token}" target="_blank">
          ${req.address}/verifikasi-email/${token}
        </a></p>
        `,
  });
};

const sendResetPasswordLink = (req, email, token) => {
  return transporter.sendMail({
    to: email,
    from: process.env.NODEMAILER_EMAIL,
    subject: 'Reset Password',
    html: `
        <h3>Klik link di bawah ini untuk ganti password anda</h3>
        <p><a href="${req.address}/reset-password/${token}" target="_blank">
          ${req.address}/reset-password/${token}
        </a></p>
        `,
  });
};

module.exports = {
  transporter,
  sendEmailVerificationLink,
  sendResetPasswordLink,
};
