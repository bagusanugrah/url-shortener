/* eslint-disable prefer-promise-reject-errors */
/* eslint-disable new-cap */
const express = require('express');
const {body} = require('express-validator/check');

const authController = require('../controllers/auth');
const {User} = require('../models');

const router = express.Router();

router.get('/token-kadaluarsa', authController.getTokenKadaluarsa);

router.get('/login', authController.getLogin);

router.get('/register', authController.getRegister);

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

router.get('/verifikasi-berhasil', authController.getVerifikasiBerhasil);

router.get('/form-verifikasi-email', authController.getFormVerifikasiEmail);

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

router.get('/verifikasi-email/:token', authController.getVerifikasiEmail);

router.post('/verifikasi-email', authController.postVerifikasiEmail);

router.get('/form-reset-password', authController.getResetForm);

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

router.get('/reset-password/:token', authController.getReset);

router.post('/reset-password',
    body('password').isLength({min: 1}).withMessage('Form tidak boleh kosong!')
    , authController.postReset);

module.exports = router;
