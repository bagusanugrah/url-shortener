exports.get404 = (req, res, next) => {
  res.status(404).render('404', {
    pageTitle: 'Halaman Tidak Ditemukan!',
  });
};

exports.get500 = (req, res, next) => {
  res.status(500).render('500', {
    pageTitle: 'Telah terjadi kesalahan teknis!',
  });
};
