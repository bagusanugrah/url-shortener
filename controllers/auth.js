const {nanoid} = require('nanoid');
const {validationResult} = require('express-validator');
const bcrypt = require('bcryptjs');

const {User, EmailVerification, PasswordReset} = require('../models');
const {error500} = require('../functions/errors');
const {sendEmailVerificationLink, sendResetPasswordLink} = require('../utils/nodemailer');

exports.getLogin = (req, res, next) => {
  try {
    res.render('auth/login', {
      pageTitle: 'Login',
      metaDescription: 'Daftar dan mulai membuat custom url anda sendiri.',
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
      return res.status(422).render('auth/login', {
        pageTitle: 'Login',
        metaDescription: 'Daftar dan mulai membuat custom url anda sendiri.',
        problemMessage: validationErrors.array()[0].msg,
        oldInput: {email},
      });
    }

    const doMatch = await bcrypt.compare(password, user.password);// mengecek apakah inputan password sama dengan yang di database

    if (doMatch) {// jika inputan password sama dengan yang di database
      // perbarui masa tenggang penghapusan user
      user.expiredAt = Date.now() + (1000*3600*24*30*6);// (6 bulan)
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
      res.render('auth/login', {
        pageTitle: 'Login',
        metaDescription: 'Daftar dan mulai membuat custom url anda sendiri.',
        problemMessage: 'Password yang anda masukkan salah!',
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
    res.render('auth/register', {
      pageTitle: 'Daftar',
      metaDescription: 'Daftar dan mulai membuat custom url anda sendiri.',
      oldInput: {email: ''},
    });
  } catch (error) {
    error500(error, next);
  }
};

exports.postRegister = async (req, res, next) => {
  try {
    const secondId = 'user-' + nanoid(16);// buat random secondId
    const email = req.body.email.toLowerCase();// ambil email dari form
    const password = req.body.password;// ambil password dari form
    const status = 'unverified';
    const expiredAt = Date.now() + (1000*60*5);// (5 menit)
    const token = nanoid(32);// membuat token baru
    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {// jika inputan tidak lolos validasi
      return res.status(422).render('auth/register', {
        pageTitle: 'Daftar',
        metaDescription: 'Daftar dan mulai membuat custom url anda sendiri.',
        problemMessage: validationErrors.array()[0].msg,
        oldInput: {email},
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);// mengenkripsi password

    await User.create({secondId, email, password: hashedPassword, status, expiredAt});// membuat user baru
    await EmailVerification.create({token, email, expiredAt});// simpan token baru dalam database

    res.status(201).render('auth/register', {
      pageTitle: 'Daftar',
      metaDescription: 'Daftar dan mulai membuat custom url anda sendiri.',
      successMessage: 'Buat akun berhasil! Silahkan cek kotak masuk email anda untuk verifikasi email.',
      oldInput: {email: ''},
    });

    sendEmailVerificationLink(req, email, token);
  } catch (error) {
    error500(error, next);
  }
};

exports.getFormVerifikasiEmail = (req, res, next) => {
  try {
    res.render('auth/form-verifikasi-email', {
      pageTitle: 'Form Verifikasi Email',
      metaDescription: 'Verifikasi email dan mulai membuat custom url anda sendiri.',
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
      return res.status(422).render('auth/form-verifikasi-email', {
        pageTitle: 'Form Verifikasi Email',
        metaDescription: 'Verifikasi email dan mulai membuat custom url anda sendiri.',
        problemMessage: validationErrors.array()[0].msg,
      });
    }

    const user = await User.findOne({where: {email}});// cari user di database
    const expiredAt = Date.now() + (1000*60*5);// (5 menit)

    if (tokenData) {// jika token ketemu
      const token = tokenData.token;// ambil tokennya

      // perbarui masa tenggang penghapusan token
      tokenData.expiredAt = expiredAt;
      await tokenData.save();

      // perbarui masa tenggang penghapusan user
      user.expiredAt = expiredAt;
      await user.save();

      sendEmailVerificationLink(req, email, token);// kirimkan token yang ketemu tadi
    } else {// jika token tidak ketemu
      const token = nanoid(32);// buat token baru

      await EmailVerification.create({token, email, expiredAt});// simpan token baru dalam database

      // perbarui masa tenggang penghapusan user
      user.expiredAt = expiredAt;
      await user.save();

      sendEmailVerificationLink(req, email, token);// kirimkan token baru
    }

    res.status(201).render('auth/form-verifikasi-email', {
      pageTitle: 'Form Verifikasi Email',
      metaDescription: 'Verifikasi email dan mulai membuat custom url anda sendiri.',
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

    res.render('auth/verifikasi-email', {
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
    user.expiredAt = Date.now() + (1000*3600*24*30*6);// (6 bulan)

    await user.save();// perbarui data user
    await tokenData.destroy();// menghapus token dari database

    res.render('auth/verifikasi-berhasil', {
      pageTitle: 'Email Berhasil Diverifikasi!',
    });
  } catch (error) {
    error500(error, next);
  }
};

exports.getResetForm = (req, res, next) => {
  try {
    res.render('auth/form-reset-password', {
      pageTitle: 'Reset Password',
      metaDescription: 'Reset password anda di sini.',
      oldInput: '',
    });
  } catch (error) {
    error500(error, next);
  }
};

exports.postResetForm = async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase();// ambil email dari form
    const expiredAt = Date.now() + (1000*60*5);// (5 menit)
    const tokenData = await PasswordReset.findOne({where: {email}});// cari token di database
    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {// jika inputan tidak lolos validasi
      return res.status(422).render('auth/form-reset-password', {
        pageTitle: 'Reset Password',
        metaDescription: 'Reset password anda di sini.',
        problemMessage: validationErrors.array()[0].msg,
        oldInput: {email},
      });
    }

    if (tokenData) {// jika token ketemu
      const token = tokenData.token;// ambil tokennya

      tokenData.expiredAt = expiredAt;// perbarui masa tenggang penghapusan token
      await tokenData.save();// perbarui data token

      sendResetPasswordLink(req, email, token);
    } else {// jika token tidak ketemu
      const token = nanoid(32);// buat token baru

      await PasswordReset.create({token, email, expiredAt}); // simpan token baru dalam database

      sendResetPasswordLink(req, email, token);
    }

    res.status(201).render('auth/form-reset-password', {
      pageTitle: 'Reset Password',
      metaDescription: 'Reset password anda di sini.',
      successMessage: 'Link untuk reset password telah dikirim ke email anda.',
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

    res.render('auth/reset-password', {
      pageTitle: 'Reset Password',
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
      return res.status(422).render('auth/reset-password', {
        pageTitle: 'Reset Password',
        problemMessage: validationErrors.array()[0].msg,
        token,
      });
    }

    const user = await User.findOne({where: {email: tokenData.email}});// cari user di database

    user.password = newPassword;// perbarui password user
    await user.save();// perbarui data user
    await tokenData.destroy();// hapus token dari database

    res.render('auth/reset-berhasil', {
      pageTitle: 'Password berhasil diganti!',
    });
  } catch (error) {
    error500(error, next);
  }
};
