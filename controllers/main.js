const path = require('path');
const fs = require('fs');

const {nanoid} = require('nanoid');
const {customAlphabet} = require('nanoid/async');
const {validationResult} = require('express-validator');

const {GuestShortenedUrl, ShortenedUrl, User} = require('../models');
const {error500} = require('../functions/errors');
const {transporter} = require('../utils/nodemailer');
const {alphanumeric} = require('../functions/alphanumeric');

/* untuk pagination */
const urlsPerPage = 5;// banyak url yang ditempilkan perhalaman
/* untuk pagination */

exports.getIndex = async (req, res, next) => {
  try {
    if (req.loggedInUser) {// jika user logged in
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

      res.render('main/user-index', {
        shortenedUrls,
        totalPages,
        currentPage,
        page: 'home',
      });
    } else {// jika user tidak logged in
      res.render('main/index', {
        page: 'home',
      });
    }
  } catch (error) {
    error500(error, next);
  }
};

exports.postShorten = async (req, res, next) => {
  try {
    let url = req.body.url;// ambil url dari form
    if (!url.includes('http')) {// jika url tidak mengandung http
      url = `http://${url}`;
    }
    const secondId = 'url-' + nanoid(16);// buat random secondId
    const randomAlphanumeric = customAlphabet(alphanumeric(), 6);
    let parameter = await randomAlphanumeric();// buat random parameter
    const expiredAt = Date.now() + (1000*3600*24*7);// (7 hari)
    let isAvailable = true;
    const validationErrors = validationResult(req);
    const renderPage = req.loggedInUser ? 'main/user-index' : 'main/index';// cek apakah user logged in atau tidak

    /* untuk paginasi */
    let currentPage;// ambil nilai query dari url
    let allUrls;// ambil semua url dari database
    let totalUrls;// banyaknya url di database
    let totalPages;// banyaknya halaman, Math.ceil() melakukan pembulatan ke atas
    let skipRows;// banyaknya rows yang diskip dihitung dari row pertama

    if (req.loggedInUser) {
      currentPage = +req.query.halaman ? +req.query.halaman : 1;// ambil nilai query dari url
      allUrls = await ShortenedUrl.findAll({where: {userId: req.loggedInUser.id}});// ambil semua url dari database
      totalUrls = allUrls.length;// banyaknya url di database
      totalPages = Math.ceil(totalUrls/urlsPerPage);// banyaknya halaman, Math.ceil() melakukan pembulatan ke atas
      skipRows = (currentPage-1) * urlsPerPage;// banyaknya rows yang diskip dihitung dari row pertama
    }
    /* untuk paginasi */

    if (!validationErrors.isEmpty()) {// jika inputan tidak lolos validasi
      const shortenedUrls = req.loggedInUser ?
      await ShortenedUrl.findAll({// ambil data url dengan paginasi
        where: {userId: req.loggedInUser.id},
        order: [['id', 'DESC']], // urutannya direverse
        offset: skipRows,
        limit: urlsPerPage,
      }) : null;

      return res.status(422).render(renderPage, {
        problemMessage: validationErrors.array()[0].msg,
        shortenedUrls,
        totalPages,
        currentPage,
        page: 'home',
      });
    }

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
        parameter = await randomAlphanumeric();// buat random parameter baru
      }
    }

    if (req.loggedInUser) {// jika user logged in
      await ShortenedUrl.create({secondId, url, parameter, userId: req.loggedInUser.id});// simpan URL baru dalam database
    } else {// jika user tidak logged in
      await GuestShortenedUrl.create({secondId, url, parameter, expiredAt});// simpan URL baru dalam database
    }

    const shortenedUrls = req.loggedInUser ?
    await ShortenedUrl.findAll({// ambil data url dengan paginasi
      where: {userId: req.loggedInUser.id},
      order: [['id', 'DESC']], // urutannya direverse
      offset: skipRows,
      limit: urlsPerPage,
    }) : null;
    if (req.loggedInUser) {// jika user logged in
      return res.status(201).render('main/user-index', {
        successMessage: `URL berhasil dibuat secara random, URL baru ada di baris paling atas. Anda bisa mengedit URL 
        dengan mengklik tombol pensil warna kuning dan menghapus URL dengan mengklik tombol trash warna merah.`,
        shortenedUrls,
        totalPages,
        currentPage,
        page: 'home',
      });
    }
    res.status(201).render('main/index', {
      successMessage: `
      Berikut adalah URL anda <a href="${req.address}/${parameter}" id="short-url" target="_blank">${req.domain}/${parameter}</a>  (besar kecil huruf berpengaruh)
      <br>
      <br>
      Penting:<br>
      URL ini dibuat secara random dan akan dihapus secara otomatis dari database jika selama 7 hari tidak digunakan. Login terlebih dahulu agar anda bisa 
      membuat custom URL anda sendiri dan agar URL menjadi permanen.
      `,
      page: 'home',
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

    if (!req.loggedInUser) {// jika user tidak logged in
      return res.redirect('/login');
    }

    if (shortenedUrl.userId !== req.loggedInUser.id) {// jika route ini dibuka oleh bukan pemiliknya
      return res.redirect('/');
    }

    res.render('main/edit-url', {
      pageTitle: 'Edit URL',
      url: shortenedUrl.url,
      oldInput: {parameter}, // untuk oldInput
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
      return res.status(422).render('main/edit-url', {
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

exports.deleteGuestUrl = async (req, res, next) => {
  try {
    const parameter = req.params.parameter;
    const url = await GuestShortenedUrl.findOne({where: {parameter}});

    if (!url) {
      return res.status(200).json({message: 'Success!'});
    } else {
      await url.destroy();
      return res.status(200).json({message: 'Success!'});
    }
  } catch (error) {
    return res.status(500).json({message: 'Gagal hapus URL!'});
  }
};

exports.getRedirect = async (req, res, next) => {
  try {
    const parameter = req.params.key;// ambil parameter
    const guestShortened = await GuestShortenedUrl.findOne({where: {parameter}});// cari paramater di database
    const shortened = await ShortenedUrl.findOne({where: {parameter}});// cari paramater di database

    if (guestShortened) {// jika paramater ketemu di guestShortened
      guestShortened.expiredAt = Date.now() + (1000*3600*24*7);// (7 hari) perbarui masa tenggang penghapusan url
      await guestShortened.save();// perbarui data url
      res.redirect(guestShortened.url);
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
    res.render('main/report-bug', {
      pageTitle: 'Laporkan Bug',
      // metaDescription: 'Laporkan bug di sini.',
      page: 'bug',
    });
  } catch (error) {
    error500(error, next);
  }
};

exports.postReportBug = async (req, res, next) => {
  try {
    const screenshot = req.file;// jika tidak ada file yang diupload, req.file akan bernilai undefined
    let screenshotPath;
    const penjelasan = req.body.penjelasan;// ambil penjelasan dari form
    const validationErrors = validationResult(req);

    if (screenshot) {
      screenshotPath = path.join('upload', 'images', screenshot.filename);// lokasi file berada
    }

    if (!validationErrors.isEmpty()) {// jika tidak lolos validasi
      if (screenshot) {
        fs.unlink(screenshotPath, (error) => {// file yang sudah terupload akan dihapus secara asynchronous
          if (error) {
            console.log(error);
          }
        });
      }
      return res.status(422).render('main/report-bug', {
        pageTitle: 'Laporkan Bug',
        // metaDescription: 'Laporkan bug di sini.',
        problemMessage: validationErrors.array()[0].msg,
        page: 'bug',
      });
    }

    if (screenshot) {
      transporter.sendMail({
        to: 'bagus.anugrah71@gmail.com',
        from: process.env.NODEMAILER_EMAIL,
        subject: `Laporan Bug - ${new Date().toISOString()}`,
        html: `<p><pre>${penjelasan}</pre></p>`,
        attachments: [
          {
            filename: screenshot.filename,
            content: fs.createReadStream(screenshotPath),
          },
        ],
      });

      setTimeout(() => {
        fs.unlink(screenshotPath, (error) => {// menghapus file secara asynchronous
          if (error) {
            console.log(error);
          }
        });
      }, 60000*3);
    } else {// jika tidak ada screenshot yang diupload
      transporter.sendMail({
        to: 'bagus.anugrah71@gmail.com',
        from: process.env.NODEMAILER_EMAIL,
        subject: `Laporan Bug - ${new Date().toISOString()}`,
        html: `<p><pre>${penjelasan}</pre></p>`,
      });
    }

    res.render('main/report-bug', {
      pageTitle: 'Laporkan Bug',
      // metaDescription: 'Laporkan bug di sini.',
      successMessage: 'Terima  kasih atas laporannya, saya akan berusaha mengatasi bug/masalah tersebut.',
      page: 'bug',
    });
  } catch (error) {
    error500(error, next);
  }
};

exports.getKetentuan = (req, res, next) => {
  try {
    res.render('main/ketentuan', {
      pageTitle: 'Ketentuan',
      // metaDescription: 'Baca ketentuan-ketentuan idurl.id di sini.',
      page: 'ketentuan',
    });
  } catch (error) {
    error500(error, next);
  }
};

exports.getStat = async (req, res, next) => {
  try {
    const users = await User.findAll();
    const guestURLs = await GuestShortenedUrl.findAll();
    const userURLs = await ShortenedUrl.findAll();
    const totalUsers = users.length;
    const totalGuestURLs = guestURLs.length;
    const totalUserURLs = userURLs.length;

    res.render('main/stat', {
      pageTitle: 'Stat',
      totalUsers,
      totalGuestURLs,
      totalUserURLs,
    });
  } catch (error) {
    error500(error, next);
  }
};

exports.getDonasi = (req, res, next) => {
  try {
    res.render('main/donasi', {
      pageTitle: 'Donasi',
      metaDescription: 'Silahkan donasikan sebagian harta anda di sini.',
      metaKeywords: 'donasi,donate,donate me,sedekah',
      page: 'donasi',
    });
  } catch (error) {
    error500(error, next);
  }
};
