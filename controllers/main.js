const {nanoid} = require('nanoid');
const {validationResult} = require('express-validator');

const {GuestShortenedUrl, ShortenedUrl} = require('../models');
const {error500} = require('../functions/errors');

/* untuk pagination */
const urlsPerPage = 5;// banyak url yang ditempilkan perhalaman
/* untuk pagination */

exports.getIndex = async (req, res, next) => {
  try {
    if (req.isLoggedIn) {// jika user logged in
      const currentPage = +req.query.halaman ? +req.query.halaman : 1;// ambil nilai query dari url
      const allUrls = await ShortenedUrl.findAll({where: {userId: req.loggedInUser.id}});// ambil semua url dari database
      const totalUrls = allUrls.length;// banyaknya url di database
      const totalPages = Math.ceil(totalUrls/urlsPerPage);// banyaknya halaman, Math.ceil() melakukan pembulatan ke atas
      const skipRows = (currentPage-1) * urlsPerPage;// banyaknya rows yang diskip dihitung dari row pertama

      const shortenedUrls = await ShortenedUrl.findAll({// ambil data url dengan paginasi
        where: {userId: req.loggedInUser.id},
        order: [['id', 'DESC']], // urutannya direverse
        offset: skipRows,
        limit: urlsPerPage,
      });

      let successMessage = req.flash('success');

      if (successMessage.length > 0) {
        successMessage = successMessage[0];
      } else {
        successMessage = '';
      }

      res.render('user-index', {
        pageTitle: `${req.domain} | URL shortener buatan orang indo`,
        problemMessage: '',
        successMessage,
        shortenedUrls,
        totalPages,
        currentPage,
      });
    } else {// jika user tidak logged in
      res.render('index', {
        pageTitle: `${req.domain} | URL shortener buatan orang indo`,
        problemMessage: '',
        successMessage: '',
      });
    }
  } catch (error) {
    error500(error, next);
  }
};

exports.postShorten = async (req, res, next) => {
  try {
    const url = req.body.url;// ambil url dari form
    let secondId = 'url-' + nanoid(16);// buat random secondId
    let parameter = nanoid(6);// buat random parameter
    const expiredAt = Date.now() + 30000;// (3600000*24*3)
    let isAvailable = true;
    const validationErrors = validationResult(req);
    const renderPage = req.isLoggedIn ? 'user-index' : 'index';// cek apakah user logged in atau tidak

    /* untuk paginasi */
    const currentPage = +req.query.halaman ? +req.query.halaman : 1;// ambil nilai query dari url
    const allUrls = await ShortenedUrl.findAll({where: {userId: req.loggedInUser.id}});// ambil semua url dari database
    const totalUrls = allUrls.length;// banyaknya url di database
    const totalPages = Math.ceil(totalUrls/urlsPerPage);// banyaknya halaman, Math.ceil() melakukan pembulatan ke atas
    const skipRows = (currentPage-1) * urlsPerPage;// banyaknya rows yang diskip dihitung dari row pertama
    /* untuk paginasi */

    if (!validationErrors.isEmpty()) {// jika inputan tidak lolos validasi
      const shortenedUrls = req.isLoggedIn ?
      await ShortenedUrl.findAll({// ambil data url dengan paginasi
        where: {userId: req.loggedInUser.id},
        order: [['id', 'DESC']], // urutannya direverse
        offset: skipRows,
        limit: urlsPerPage,
      }) : null;

      return res.status(422).render(renderPage, {
        pageTitle: `${req.domain} | URL shortener buatan orang indo`,
        problemMessage: validationErrors.array()[0].msg,
        successMessage: '',
        shortenedUrls,
        totalPages,
        currentPage,
      });
    }

    while (isAvailable) {// cek apakah random secondId ada di database
      const guestUrl = await GuestShortenedUrl.findOne({where: {secondId}});
      const url = await ShortenedUrl.findOne({where: {secondId}});

      if (guestUrl || url) {// jika random secondId ada di database
        secondId = 'url-' + nanoid(16);// buat random secondId baru
      } else {// jika random secondId tidak ada di database
        isAvailable = false;// tidak usah buat random secondId baru
      }
    }

    isAvailable = true;

    while (isAvailable) {// cek apakah random parameter ada di database
      const guestUrl = await GuestShortenedUrl.findOne({where: {parameter}});// cari random paramater di database
      const url = await ShortenedUrl.findOne({where: {parameter}});// cari random parameter di database

      /**
       Keterangan:
       guestUrl itu untuk user yang tidak logged in dan url itu untuk user yang logged in
       */

      if (!guestUrl && !url) {// jika random parameter tidak ada di database
        isAvailable = false;// tidak usah bikin random parameter baru
      } else {// jika random parameter ada di database
        parameter = nanoid(6);// buat random parameter baru
      }
    }

    if (req.isLoggedIn) {// jika user logged in
      await ShortenedUrl.create({secondId, url, parameter, userId: req.loggedInUser.id});// simpan URL baru dalam database
    } else {// jika user tidak logged in
      await GuestShortenedUrl.create({secondId, url, parameter, expiredAt});// simpan URL baru dalam database
    }

    const shortenedUrls = req.isLoggedIn ?
    await ShortenedUrl.findAll({// ambil data url dengan paginasi
      where: {userId: req.loggedInUser.id},
      order: [['id', 'DESC']], // urutannya direverse
      offset: skipRows,
      limit: urlsPerPage,
    }) : null;
    if (req.isLoggedIn) {// jika user logged in
      return res.render('user-index', {
        pageTitle: `${req.domain} | URL shortener buatan orang indo`,
        problemMessage: '',
        successMessage: `URL berhasil dibuat secara random, URL baru ada di baris paling atas. Anda bisa mengedit URL 
        dengan mengklik tombol pensil warna kuning dan menghapus URL dengan mengklik tombol trash warna merah.`,
        shortenedUrls,
        totalPages,
        currentPage,
      });
    }
    res.render('index', {
      pageTitle: `${req.domain} | URL shortener buatan orang indo`,
      problemMessage: '',
      successMessage: `
      Berikut adalah URL anda <a href="${req.address}/${parameter}" target="_blank">${req.address}/${parameter}</a>  (besar kecil huruf berpengaruh)
      <br>
      <br>
      Penting:<br>
      URL ini dibuat secara random dan akan dihapus secara otomatis dari database jika selama 3 hari tidak digunakan. Login terlebih dahulu agar anda bisa 
      membuat custom URL anda sendiri dan agar URL menjadi permanen.
      `,
      shortenedUrls,
    });
  } catch (error) {
    error500(error, next);
  }
};

exports.getEditUrl = async (req, res, next) => {
  try {
    const parameter = req.params.key;// ambil parameter dari form untuk oldInput
    const shortenedUrl = await ShortenedUrl.findOne({where: {parameter}});// cari url di database

    if (!shortenedUrl) {// jika url tidak ketemu
      return next();// lanjut ke middleware/controller berikutnya
    }

    if (!req.isLoggedIn) {// jika user tidak logged in
      return res.redirect('/login');
    }

    if (shortenedUrl.userId !== req.loggedInUser.id) {// jika route ini dibuka oleh bukan pemiliknya
      return res.redirect('/');
    }

    res.render('edit-url', {
      pageTitle: 'Edit URL',
      url: shortenedUrl.url,
      oldInput: {parameter}, // untuk oldInput
      problemMessage: '',
      parameter, // untuk form action
    });
  } catch (error) {
    error500(error, next);
  }
};

exports.postEditUrl = async (req, res, next) => {
  try {
    const inputParam = req.body.inputParam;// ambil parameter dari form untuk oldInput
    const parameter = req.body.hiddenParam;// ambil parameter dari hidden input untuk form action
    const shortenedUrl = await ShortenedUrl.findOne({where: {parameter}});// cari url di database
    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {// jika inputan tidak lolos validasi
      return res.status(422).render('edit-url', {
        pageTitle: 'Edit URL',
        url: shortenedUrl.url,
        oldInput: {parameter: inputParam}, // untuk oldInput
        problemMessage: validationErrors.array()[0].msg,
        parameter, // untuk form action
      });
    }

    shortenedUrl.parameter = inputParam;
    await shortenedUrl.save();

    res.redirect('/');
  } catch (error) {
    error500(error, next);
  }
};

exports.postDeleteUrl = async (req, res, next) => {
  try {
    const secondId = req.body.urlId;// ambil secondId dari hidden input

    await ShortenedUrl.destroy({where: {secondId}});// hapus url dari database

    res.redirect('/');
  } catch (error) {
    error500(error, next);
  }
};

exports.getRedirect = async (req, res, next) => {
  try {
    const parameter = req.params.key;// ambil parameter
    const guestShortened = await GuestShortenedUrl.findOne({where: {parameter}});// cari paramater di database
    const shortened = await ShortenedUrl.findOne({where: {parameter}});// cari paramater di database

    if (guestShortened) {// jika paramater ketemu di guestShortened
      res.redirect(guestShortened.url);
      guestShortened.expiredAt = Date.now() + 30000;// (3600000*24*3) perbarui masa tenggang penghapusan url
      await guestShortened.save();// perbarui data url
    } else if (shortened) {// jika paramater ketemu di shortened
      res.redirect(shortened.url);
    } else {// jika parameter tidak ada di database
      return next();// lanjut ke middleware/controller berikutnya
    }
  } catch (error) {
    error500(error, next);
  }
};

exports.getReportBug = (req, res, next) => {
  try {
    res.render('report-bug', {
      pageTitle: 'Laporkan Bug',
      problemMessage: 'Upload gambar yang valid! (PNG/JPG/GIF)',
      successMessage: 'Terima  kasih atas laporannya, saya akan berusaha mengatasi bug/masalah tersebut.',
    });
  } catch (error) {
    error500(error, next);
  }
};
