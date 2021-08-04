const {nanoid} = require('nanoid');
const {validationResult} = require('express-validator/check');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

const {User, EmailVerification} = require('../models');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'nadliomablo@gmail.com',
    pass: 'Pcgame20072000',
  },
});

exports.getLogin = (req, res, next) => {
  res.render('login', {
    pageTitle: 'Login',
    problemMessage: 'Invalid email!',
    successMessage: 'Verifikasi email berhasil!',
  });
};

exports.getRegister = (req, res, next) => {
  res.render('register', {
    pageTitle: 'Sign Up',
    problemMessage: '',
    successMessage: '',
    oldInput: {email: ''},
  });
};

exports.postRegister = async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase();
    const password = req.body.password;
    const status = 'unverified';
    const expiredAt = Date.now() + (1000*60*5);// (3600000*24)
    const token = nanoid(32);
    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {
      // console.log('ISINYA ERRORNYA', validationErrors.array());
      return res.status(422).render('register', {
        pageTitle: 'Sign Up',
        problemMessage: validationErrors.array()[0].msg,
        successMessage: '',
        oldInput: {email},
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({email, password: hashedPassword, status, expiredAt});
    await EmailVerification.create({token, email, expiredAt});

    res.render('register', {
      pageTitle: 'Sign Up',
      problemMessage: '',
      successMessage: 'Registrasi berhasil! Silahkan cek email inbox anda untuk verifikasi email.',
      oldInput: {email: ''},
    });

    transporter.sendMail({
      to: req.body.email,
      from: 'URLmu.id',
      subject: 'Verifikasi Email',
      html: `
      <h3>Klik link di bawah ini untuk verifikasi email anda</h3>
      <p><a href="http://localhost:5000/verifikasi-email/${token}" target="_blank">
        http://localhost:5000/verifikasi-email/${token}
      </a></p>
      `,
    });
  } catch (error) {
    console.log(error);
    const err = new Error(error);
    err.httpStatusCode = 500;
    return next(err);
  }
};

exports.getReset = (req, res, next) => {
  res.render('reset-password', {
    pageTitle: 'Reset Password',
    problemMessage: 'Invalid email!',
  });
};
