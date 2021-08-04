/* eslint-disable new-cap */
const express = require('express');

const authController = require('../controllers/auth');

const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/register', authController.getRegister);

router.get('/reset-password', authController.getReset);

module.exports = router;
