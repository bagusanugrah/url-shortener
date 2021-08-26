exports.get404 = (req, res, next) => {
  res.status(404).render('error/404', {
    pageTitle: 'Halaman Tidak Ditemukan!',
  });
};

exports.get500 = (error, req, res, next) => {// middleware ini dijalankan ketika terjadi error
  const statusCode = error.httpStatusCode ? error.httpStatusCode : 500;
  res.status(statusCode).render('error/500', {
    pageTitle: 'Terjadi kesalahan teknis!',
    metaDescription: 'Internal Server Error',
    metaKeywords: '500',
    metaAuthor: 'Bagus Anugrah',
    page: '',
    domain: req.domain,
    address: req.address,
    isLoggedIn: req.isLoggedIn,
  });
};

exports.getUnderConstruction = (req, res, next) => {
  const isUnderConstruction = process.env.IS_UNDER_CONSTRUCTION;
  if (isUnderConstruction === 'false') {
    return next();
  }
  res.render('error/under-construction', {
    pageTitle: 'Under Construction',
  });
};
