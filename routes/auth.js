/* eslint-disable prefer-promise-reject-errors */
/* eslint-disable new-cap */
const express = require('express');
const {body} = require('express-validator/check');

const authController = require('../controllers/auth');
const {User} = require('../models');

const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/register', authController.getRegister);

router.post('/register', [
  body('email').isLength({min: 1}).withMessage('Form tidak boleh kosong!')
      .isEmail().withMessage('Masukkan email yang valid!').custom(async (value, {req}) => {
        const user = await User.findOne({where: {email: value}});
        if (user) {
          return Promise.reject('Email sudah dipakai!');
        }
      }).trim(),
  body('password').isLength({min: 1}).withMessage('Form tidak boleh kosong!'),
  body('confirmPassword').isLength({min: 1}).withMessage('Form tidak boleh kosong!')
      .custom((value, {req}) => {
        if (value !== req.body.password) {
          throw new Error('Confirm Password harus sama percis dengan Password!');
        }
        return true;
      }),
], authController.postRegister);

router.get('/form-verifikasi-email', authController.getFormVerifikasiEmail);

router.post('/form-verifikasi-email',
    body('email').isLength({min: 1}).withMessage('Form tidak boleh kosong!')
        .isEmail().withMessage('Masukkan email yang valid!').custom(async (value, {req}) => {
          const user = await User.findOne({where: {email: value}});
          if (!user) {
            return Promise.reject('Email belum terdaftar!');
          }
        }).custom(async (value, {req}) => {
          const user = await User.findOne({where: {email: value}});

          if (user.status === 'verified') {
            return Promise.reject('Email sudah terverifikasi!');
          }
        }).trim()
    , authController.postFormVerifikasiEmail);

router.get('/verifikasi-email/:token', authController.getVerifikasiEmail);

router.post('/verifikasi-email', authController.postVerifikasiEmail);

router.get('/reset-password', authController.getReset);

module.exports = router;
