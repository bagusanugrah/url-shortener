exports.get404 = (req, res, next) => {
  res.status(404).render('error/404', {
    pageTitle: 'Halaman Tidak Ditemukan!',
  });
};

exports.get500 = (error, req, res, next) => {// middleware ini dijalankan ketika terjadi error
  const statusCode = error.httpStatusCode ? error.httpStatusCode : 500;
  res.status(statusCode).render('error/500', {
    pageTitle: 'Terjadi kesalahan teknis!',
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
