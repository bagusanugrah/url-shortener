const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

const sendEmailVerificationLink = (req, email, token) => {
  return transporter.sendMail({// kirimkan token yang ketemu tadi
    to: email,
    from: `${req.domain}`,
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
    from: `${req.domain}`,
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
