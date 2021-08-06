/* eslint-disable new-cap */
const express = require('express');
const {body} = require('express-validator/check');

const mainController = require('../controllers/main');
const errorController = require('../controllers/error');

const router = express.Router();

router.get('/', mainController.getIndex);

router.post('/', body('url').isLength({min: 1}).withMessage('Form tidak boleh kosong!')
    .isURL().withMessage('Masukkan URL yang valid!').trim()
, mainController.postShorten);

router.post('/delete', mainController.postDeleteUrl);

router.get('/report-bug', mainController.getReportBug);

router.get('/:key', mainController.getRedirect, errorController.get404);

module.exports = router;
