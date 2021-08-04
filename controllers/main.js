const {nanoid} = require('nanoid');
const {GuestShortenedUrl} = require('../models');

const {validationResult} = require('express-validator/check');

exports.getIndex = (req, res, next) => {
  res.render('index', {
    pageTitle: 'URLmu.id | URL shortener buatan orang indo',
    problemMessage: '',
    successMessage: '',
  });
};

exports.postShorten = async (req, res, next) => {
  try {
    const url = req.body.url;
    let parameter = nanoid(6);
    const expiredAt = Date.now() + 30000;// (3600000*24*3)
    let isUnavailable = true;
    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {
      return res.render('index', {
        pageTitle: 'Pendekin.Link | Url shortener buatan orang indo',
        problemMessage: validationErrors.array()[0].msg,
        successMessage: '',
      });
    }

    while (isUnavailable) {
      const guestUrl = await GuestShortenedUrl.findOne({where: {parameter}});
      // const url = await ShortenedUrl.findOne({where: {parameter}});

      if (!guestUrl) {// !guestUrl || !url
        isUnavailable = false;
      } else {
        parameter = nanoid(6);
      }
    }


    await GuestShortenedUrl.create({url, parameter, expiredAt});

    res.render('index', {
      pageTitle: 'URLmu.id | URL shortener buatan orang indo',
      problemMessage: '',
      successMessage: `
      Berikut adalah URL anda <a href="http://localhost:5000/${parameter}" target="_blank">http://localhost:5000/${parameter}</a>  (besar kecil huruf berpengaruh)
      <br>
      <br>
      Penting:<br>
      URL ini dibuat secara random dan akan dihapus secara otomatis dari database jika selama 3 hari tidak digunakan. Login terlebih dahulu agar anda bisa 
      membuat custom URL anda sendiri dan agar URL menjadi permanen.
      `,
    });
  } catch (error) {
    console.log(error);
    const err = new Error(error);
    err.httpStatusCode = 500;
    return next(err);
  }
};

exports.getRedirect = async (req, res, next) => {
  try {
    const parameter = req.params.key;
    const guestShortened = await GuestShortenedUrl.findOne({where: {parameter}});// untuk guest
    // const shortened = await ShortenedUrl.findOne({where: {parameter}});// untuk user

    if (guestShortened) {
      res.redirect(guestShortened.url);
      guestShortened.expiredAt = Date.now() + 30000;// (3600000*24*3)
      await guestShortened.save();
    }
    // else if (shortened) {
    //   res.redirect(shortened.url);
    // }
    else {
      return res.status(404).render('404', {
        pageTitle: 'Halaman Tidak Ditemukan!',
      });
    }
  } catch (error) {
    console.log(error);
    const err = new Error(error);
    err.httpStatusCode = 500;
    return next(err);
  }
};

exports.getReportBug = (req, res, next) => {
  res.render('report-bug', {
    pageTitle: 'Laporkan Bug',
    problemMessage: 'Upload gambar yang valid! (PNG/JPG/GIF)',
    successMessage: 'Terima  kasih atas laporannya, saya akan berusaha mengatasi bug/masalah tersebut.',
  });
};
