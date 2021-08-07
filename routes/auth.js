/* eslint-disable prefer-promise-reject-errors */
/* eslint-disable new-cap */
const express = require('express');
const {body} = require('express-validator');

const authController = require('../controllers/auth');
const {isGuest} = require('../controllers/main');
const errorController = require('../controllers/error');
const {User} = require('../models');

const router = express.Router();

router.get('/login', isGuest, authController.getLogin);

router.post('/login', [
  body('email').isLength({min: 1}).withMessage('Form tidak boleh kosong!')
      .isEmail().withMessage('Masukkan email yang valid!')
      .custom(async (value, {req}) => {
        const user = await User.findOne({where: {email: value}});// cari user di database
        if (!user) {// jika user tidak ketemu
          return Promise.reject('Email belum terdaftar!');
        }
      })
      .custom(async (value, {req}) => {
        const user = await User.findOne({where: {email: value}});// cari user di database
        if (user.status === 'unverified') {// jika email user belum diverifikasi
          return Promise.reject('Email belum diverifikasi!');
        }
      }).trim(), // .trim() agar semua whitespace (spasi/tab) yang ada di akhir dihapus
  body('password').isLength({min: 1}).withMessage('Form tidak boleh kosong!'),
], authController.postLogin);

router.post('/logout', authController.postLogout);

router.get('/register', isGuest, authController.getRegister);

router.post('/register', [
  body('email').isLength({min: 1}).withMessage('Form tidak boleh kosong!')
      .isEmail().withMessage('Masukkan email yang valid!')
      .custom(async (value, {req}) => {
        const user = await User.findOne({where: {email: value}});// cari email di database
        if (user) {// jika email ketemu
          return Promise.reject('Email sudah dipakai!');
        }
      }).trim(),
  body('password').isLength({min: 1}).withMessage('Form tidak boleh kosong!'),
  body('confirmPassword').isLength({min: 1}).withMessage('Form tidak boleh kosong!')
      .custom((value, {req}) => {
        if (value !== req.body.password) {// jika Confirm Password tidak cocok dengan Password
          throw new Error('Confirm Password harus sama percis dengan Password!');
        }
        return true;
      }),
], authController.postRegister);

router.get('/form-verifikasi-email', isGuest, authController.getFormVerifikasiEmail);

router.post('/form-verifikasi-email',
    body('email').isLength({min: 1}).withMessage('Form tidak boleh kosong!')
        .isEmail().withMessage('Masukkan email yang valid!')
        .custom(async (value, {req}) => {
          const user = await User.findOne({where: {email: value}});// cari email di database
          if (!user) {// jika email tidak ketemu
            return Promise.reject('Email belum terdaftar!');
          }
        })
        .custom(async (value, {req}) => {
          const user = await User.findOne({where: {email: value}});// cari status user di database

          if (user.status === 'verified') {// jika status user sudah terverifikasi
            return Promise.reject('Email sudah terverifikasi!');
          }
        }).trim()
    , authController.postFormVerifikasiEmail);

router.get('/verifikasi-email/:token', isGuest, authController.getVerifikasiEmail, errorController.get404);

router.post('/verifikasi-email', authController.postVerifikasiEmail, errorController.get404);

router.get('/form-reset-password', isGuest, authController.getResetForm);

router.post('/form-reset-password',
    body('email').isLength({min: 1}).withMessage('Form tidak boleh kosong!')
        .isEmail().withMessage('Masukkan email yang valid!')
        .custom(async (value, {req}) => {
          const user = await User.findOne({where: {email: value}});// cari email di database

          if (!user) {// jika email tidak ketemu
            return Promise.reject('Email belum terdaftar!');
          }
        })
        .custom(async (value, {req}) => {
          const user = await User.findOne({where: {email: value}});// cari status user di database

          if (user.status === 'unverified') {// jika status user belum terverifikasi
            return Promise.reject('Email belum diverifikasi!');
          }
        }).trim()
    , authController.postResetForm);

router.get('/reset-password/:token', isGuest, authController.getReset, errorController.get404);

router.post('/reset-password/:token',
    body('password').isLength({min: 1}).withMessage('Form tidak boleh kosong!')
    , authController.postReset, errorController.get404);

module.exports = router;
