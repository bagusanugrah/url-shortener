/* eslint-disable new-cap */
const express = require('express');
const {body} = require('express-validator/check');

const mainController = require('../controllers/main');

const router = express.Router();

router.get('/', mainController.getIndex);

router.post('/', body('url').isLength({min: 1}).withMessage('Form tidak boleh kosong!')
    .isURL().withMessage('Masukkan URL yang valid!').trim()
, mainController.postShorten);

router.get('/report-bug', mainController.getReportBug);

router.get('/:key', mainController.getRedirect);

module.exports = router;
