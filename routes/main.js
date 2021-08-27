/* eslint-disable prefer-promise-reject-errors */
/* eslint-disable new-cap */
const express = require('express');
const {body} = require('express-validator');// request body validator
const validator = require('validator');// string validator

const mainController = require('../controllers/main');
const errorController = require('../controllers/error');
const {GuestShortenedUrl, ShortenedUrl} = require('../models');

const router = express.Router();

router.get('/', mainController.getIndex);

router.post('/', body('url').isLength({min: 1}).withMessage('Form tidak boleh kosong!')
    .isURL().withMessage('Masukkan URL yang valid!').trim()
, mainController.postShorten);

router.get('/edit/:key', mainController.getEditUrl, errorController.get404);

router.post('/edit/:key', body('inputParam').isLength({min: 1}).withMessage('Form tidak boleh kosong!')
    .custom((value, {req}) => {
      if (validator.isBase64(value, {urlSafe: true})) {
        return true;// lolos validasi
      }
      throw new Error(`Inputan tidak valid! Karakter yang boleh digunakan hanya huruf (A-Z/a-z), angka (0-9), 
      tanda strip (-), dan underscore (_)`);// tidak lolos validasi
    })
    .custom(async (value, {req}) => {
      const url = await ShortenedUrl.findOne({where: {parameter: value}});// cari parameter di database
      const guestUrl = await GuestShortenedUrl.findOne({where: {parameter: value}});// cari parameter di database

      if (value !== req.body.hiddenParam && url || guestUrl) {// jika parameter ada di database
        return Promise.reject(`${value} sudah digunakan!`);
      }
    })
, mainController.postEditUrl);

router.post('/delete', mainController.postDeleteUrl);

router.get('/report-bug', mainController.getReportBug);

router.post('/report-bug', [
  body('screenshot').custom((value, {req}) => {
    const splitFileName = req.file ? req.file.originalname.split('.') : null;

    if (!splitFileName) {// jika tidak ada screenshot yang diupload
      return true;// tidak usah validasi
    }

    const fileExtension = splitFileName[splitFileName.length - 1].toLowerCase();

    if (fileExtension === 'png' || fileExtension === 'jpg' || fileExtension === 'jpeg') {
      return true;// lolos validasi
    }
    throw new Error('Upload gambar yang valid! (png/jpg/jpeg)');// tidak lolos validasi
  }).custom((value, {req}) => {
    const fileSize = req.file ? +req.file.size : null;

    if (!fileSize) {// jika tidak ada screenshot yang diupload
      return true;// tidak usah validasi
    }

    if (fileSize <= 1024*3000) {
      return true;
    }
    throw new Error('Gambar yang anda upload melebihi ukuran maksimal! Ukuran maksimal adalah 3MB');
  }),
  body('penjelasan').isLength({min: 1}).withMessage('Form tidak boleh kosong!'),
], mainController.postReportBug);

router.get('/ketentuan', mainController.getKetentuan);

router.get('/stat', mainController.getStat);

router.get('/donasi', mainController.getDonasi);

router.get('/:key', mainController.getRedirect, errorController.get404);

module.exports = router;
