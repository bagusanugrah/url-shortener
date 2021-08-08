const {nanoid} = require('nanoid');
const {validationResult} = require('express-validator');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

const {User, EmailVerification, PasswordReset} = require('../models');
const {error500} = require('../functions/errors');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

exports.getLogin = (req, res, next) => {
  try {
    let successMessage = req.flash('success');

    if (successMessage.length > 0) {
      successMessage = successMessage[0];
    } else {
      successMessage = '';
    }

    res.render('login', {
      pageTitle: 'Login',
      problemMessage: '',
      successMessage,
      oldInput: {email: ''},
    });
  } catch (error) {
    error500(error, next);
  }
};

exports.postLogin = async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase();// ambil email dari form
    const password = req.body.password;// ambil password dari form
    const user = await User.findOne({where: {email}});// cari user di database
    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {// jika inputan tidak lolos validasi
      return res.status(422).render('login', {
        pageTitle: 'Login',
        problemMessage: validationErrors.array()[0].msg,
        successMessage: '',
        oldInput: {email},
      });
    }

    const doMatch = await bcrypt.compare(password, user.password);// mengecek apakah inputan password sama dengan yang di database

    if (doMatch) {// jika inputan password sama dengan yang di database
      // perbarui masa tenggang penghapusan user
      user.expiredAt = Date.now() + (1000*3600*24);// (1000*3600*24*30*6)
      await user.save();

      // dimasukkan ke session supaya bisa digunakan di setiap request baru
      req.session.user = user;// untuk digunakan di app.js
      req.session.isLoggedIn = true;// untuk digunakan di app.js
      req.session.save((error) => {
        if (error) {// jika terjadi error
          console.log(error);
          throw new Error('TERJADI KESALAHAN LOGIN');
        }
        res.redirect('/');// jika tidak terjadi error
      });
    } else {// jika inputan password tidak sama dengan yang di database
      res.render('login', {
        pageTitle: 'Login',
        problemMessage: 'Password yang anda masukkan salah!',
        successMessage: '',
        oldInput: {email},
      });
    }
  } catch (error) {
    error500(error, next);
  }
};

exports.postLogout = (req, res, next) => {
  try {
    req.session.destroy((error) => {
      if (error) {// jika terjadi error
        console.log(error);
        throw new Error('TERJADI KESALAHAN LOGOUT');
      }
      res.redirect('/');
    });// session (yg aktif) akan dihapus dari database dan req.session.propertyTerkait menjadi undefined
  } catch (error) {
    error500(error, next);
  }
};

exports.getRegister = (req, res, next) => {
  try {
    res.render('register', {
      pageTitle: 'Sign Up',
      problemMessage: '',
      successMessage: '',
      oldInput: {email: ''},
    });
  } catch (error) {
    error500(error, next);
  }
};

exports.postRegister = async (req, res, next) => {
  try {
    let secondId = 'user-' + nanoid(16);// buat random secondId
    let isAvailable = true;
    const email = req.body.email.toLowerCase();// ambil email dari form
    const password = req.body.password;// ambil password dari form
    const status = 'unverified';
    const expiredAt = Date.now() + (1000*60*5);// (3600000*24)
    const token = nanoid(32);// membuat token baru
    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {// jika inputan tidak lolos validasi
      return res.status(422).render('register', {
        pageTitle: 'Sign Up',
        problemMessage: validationErrors.array()[0].msg,
        successMessage: '',
        oldInput: {email},
      });
    }

    while (isAvailable) {// cek apakah random secondId ada di database
      const user = await User.findOne({where: {secondId}});

      if (user) {// jika random secondId ada di database
        secondId = 'user-' + nanoid(16);// buat random secondId baru
      } else {// jika random secondId tidak ada di database
        isAvailable = false;// tidak usah buat random secondId baru
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);// mengenkripsi password

    await User.create({secondId, email, password: hashedPassword, status, expiredAt});// membuat user baru
    await EmailVerification.create({token, email, expiredAt});// simpan token baru dalam database

    res.render('register', {
      pageTitle: 'Sign Up',
      problemMessage: '',
      successMessage: 'Registrasi berhasil! Silahkan cek inbox email anda untuk verifikasi email.',
      oldInput: {email: ''},
    });

    transporter.sendMail({
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
  } catch (error) {
    error500(error, next);
  }
};

exports.getFormVerifikasiEmail = (req, res, next) => {
  try {
    res.render('form-verifikasi-email', {
      pageTitle: 'Form Verifikasi Email',
      problemMessage: '',
      successMessage: '',
    });
  } catch (error) {
    error500(error, next);
  }
};

exports.postFormVerifikasiEmail = async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase();// ambil email dari form
    const tokenData = await EmailVerification.findOne({where: {email}});// cari token di database
    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {// jika inputan tidak lolos validasi
      return res.status(422).render('form-verifikasi-email', {
        pageTitle: 'Form Verifikasi Email',
        problemMessage: validationErrors.array()[0].msg,
        successMessage: '',
      });
    }

    const user = await User.findOne({where: {email}});// cari user di database
    const expiredAt = Date.now() + (1000*60*5);// (3600000*24)

    if (tokenData) {// jika token ketemu
      const token = tokenData.token;// ambil tokennya

      // perbarui masa tenggang penghapusan token
      tokenData.expiredAt = expiredAt;
      await tokenData.save();

      // perbarui masa tenggang penghapusan user
      user.expiredAt = expiredAt;
      await user.save();

      transporter.sendMail({// kirimkan token yang ketemu tadi
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
    } else {// jika token tidak ketemu
      const token = nanoid(32);// buat token baru

      await EmailVerification.create({token, email, expiredAt});// simpan token baru dalam database

      // perbarui masa tenggang penghapusan user
      user.expiredAt = expiredAt;
      await user.save();

      transporter.sendMail({// kirimkan token baru
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
    }

    res.render('form-verifikasi-email', {
      pageTitle: 'Form Verifikasi Email',
      problemMessage: '',
      successMessage: 'Link untuk verifikasi email telah dikirim ke email anda.',
    });
  } catch (error) {
    error500(error, next);
  }
};

exports.getVerifikasiEmail = async (req, res, next) => {
  try {
    const token = req.params.token;// ambil token dari paramater url
    const tokenData = await EmailVerification.findOne({where: {token}});// cari token di database

    if (!tokenData) {// jika token tidak ketemu
      return next();
    }

    res.render('verifikasi-email', {
      pageTitle: 'Klik tombol untuk verifikasi!',
      token,
    });
  } catch (error) {
    error500(error, next);
  }
};

exports.postVerifikasiEmail = async (req, res, next) => {
  try {
    const token = req.body.token;// ambil token dari hidden form
    const tokenData = await EmailVerification.findOne({where: {token}});// cari token di database

    if (!tokenData) {// jika token tidak ketemu
      return next();
    }

    const user = await User.findOne({where: {email: tokenData.email}});// cari user di database

    user.status = 'verified';// perbarui status user menjadi terverifikasi

    // perbarui masa tenggang penghapusan user
    user.expiredAt = Date.now() + (1000*3600*24);// (1000*3600*24*30*6)

    await user.save();// perbarui data user
    await tokenData.destroy();// menghapus token dari database

    res.render('verifikasi-berhasil', {
      pageTitle: 'Email Berhasil Diverifikasi!',
    });
  } catch (error) {
    error500(error, next);
  }
};

exports.getResetForm = (req, res, next) => {
  try {
    res.render('form-reset-password', {
      pageTitle: 'Reset Password',
      problemMessage: '',
      successMessage: '',
      oldInput: '',
    });
  } catch (error) {
    error500(error, next);
  }
};

exports.postResetForm = async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase();// ambil email dari form
    const expiredAt = Date.now() + (1000*60*5);
    const tokenData = await PasswordReset.findOne({where: {email}});// cari token di database
    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {// jika inputan tidak lolos validasi
      return res.status(422).render('form-reset-password', {
        pageTitle: 'Reset Password',
        problemMessage: validationErrors.array()[0].msg,
        successMessage: '',
        oldInput: {email},
      });
    }

    if (tokenData) {// jika token ketemu
      const token = tokenData.token;// ambil tokennya

      tokenData.expiredAt = expiredAt;// perbarui masa tenggang penghapusan token
      await tokenData.save();// perbarui data token

      transporter.sendMail({
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
    } else {// jika token tidak ketemu
      const token = nanoid(32);// buat token baru

      await PasswordReset.create({token, email, expiredAt}); // simpan token baru dalam database

      transporter.sendMail({
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
    }

    res.render('form-reset-password', {
      pageTitle: 'Reset Password',
      problemMessage: '',
      successMessage: 'Link untuk ganti password telah dikirim ke email anda.',
      oldInput: '',
    });
  } catch (error) {
    error500(error, next);
  }
};

exports.getReset = async (req, res, next) => {
  try {
    const token = req.params.token;// ambil token dari parameter url
    const tokenData = await PasswordReset.findOne({where: {token}});// cari token di database

    if (!tokenData) {// jika token tidak ketemu
      return next();
    }

    res.render('reset-password', {
      pageTitle: 'Reset Password',
      problemMessage: '',
      token,
    });
  } catch (error) {
    error500(error, next);
  }
};

exports.postReset = async (req, res, next) => {
  try {
    const token = req.body.token;// ambil token dari hidden form
    const password = req.body.password;// ambil password dari form
    const newPassword = await bcrypt.hash(password, 12);// mengenkripsi password
    const tokenData = await PasswordReset.findOne({where: {token}});// cari token di database
    const validationErrors = validationResult(req);

    if (!tokenData) {// jika token tidak ketemu
      return next();
    }

    if (!validationErrors.isEmpty()) {// jika inputan tidak lolos validasi
      return res.status(422).render('reset-password', {
        pageTitle: 'Reset Password',
        problemMessage: validationErrors.array()[0].msg,
        token,
      });
    }

    const user = await User.findOne({where: {email: tokenData.email}});// cari user di database

    user.password = newPassword;// perbarui password user
    await user.save();// perbarui data user
    await tokenData.destroy();// hapus token dari database

    res.render('reset-berhasil', {
      pageTitle: 'Password berhasil diganti!',
    });
  } catch (error) {
    error500(error, next);
  }
};
