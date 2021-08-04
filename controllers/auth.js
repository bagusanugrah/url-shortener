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
  let successMessage = req.flash('success');

  if (successMessage.length > 0) {
    successMessage = successMessage[0];
  } else {
    successMessage = '';
  }

  res.render('login', {
    pageTitle: 'Login',
    problemMessage: 'Invalid email!',
    successMessage,
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
      successMessage: 'Registrasi berhasil! Silahkan cek inbox email anda untuk verifikasi email.',
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

exports.getFormVerifikasiEmail = (req, res, next) => {
  let problemMessage = req.flash('error');

  if (problemMessage.length > 0) {
    problemMessage = problemMessage[0];
  } else {
    problemMessage = '';
  }

  res.render('form-verifikasi-email', {
    pageTitle: 'Form Verifikasi Email',
    problemMessage,
    successMessage: '',
  });
};

exports.postFormVerifikasiEmail = async (req, res, next) => {
  try {
    const email = req.body.email;
    const tokenData = await EmailVerification.findOne({where: {email}});
    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {
      return res.status(422).render('form-verifikasi-email', {
        pageTitle: 'Form Verifikasi Email',
        problemMessage: validationErrors.array()[0].msg,
        successMessage: '',
      });
    }

    const user = await User.findOne({where: {email}});
    const expiredAt = Date.now() + (1000*60*5);// (3600000*24)

    if (tokenData) {
      const token = tokenData.token;

      tokenData.expiredAt = expiredAt;
      await tokenData.save();

      user.expiredAt = expiredAt;
      await user.save();

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
    } else {
      const token = nanoid(32);

      await EmailVerification.create({token, email, expiredAt});

      user.expiredAt = expiredAt;
      await user.save();

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
    }

    res.render('form-verifikasi-email', {
      pageTitle: 'Form Verifikasi Email',
      problemMessage: '',
      successMessage: 'Link untuk verifikasi email telah dikirim ke email anda',
    });
  } catch (error) {
    console.log(error);
    const err = new Error(error);
    err.httpStatusCode = 500;
    return next(err);
  }
};

exports.getVerifikasiEmail = async (req, res, next) => {
  try {
    const token = req.params.token;
    const tokenData = await EmailVerification.findOne({where: {token}});

    if (!tokenData) {
      req.flash('error', 'Token sudah kadaluarsa, silahkan isi form di bawah ini untuk mendapatkan kembali link verifikasi.');
      return res.redirect('/form-verifikasi-email');
    }

    res.render('verifikasi-email', {
      pageTitle: 'Klik tombol untuk verifikasi!',
      token,
    });
  } catch (error) {
    console.log(error);
    const err = new Error(error);
    err.httpStatusCode = 500;
    return next(err);
  }
};

exports.postVerifikasiEmail = async (req, res, next) => {
  try {
    const token = req.body.token;
    const tokenData = await EmailVerification.findOne({where: {token}});

    if (!tokenData) {
      req.flash('error', 'Token sudah kadaluarsa, silahkan isi form di bawah ini untuk mendapatkan kembali link verifikasi.');
      return res.redirect('/form-verifikasi-email');
    }

    const user = await User.findOne({where: {email: tokenData.email}});

    user.status = 'verified';
    user.expiredAt = Date.now() + (1000*3600*24);// (1000*3600*24*30*6)
    await user.save();
    await tokenData.destroy();

    req.flash('success', 'Email anda berhasil diverfikasi! Sekarang anda sudah bisa login.');
    res.redirect('/login');
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
