exports.localVariables = (req, res, next) => {// supaya variable bisa dipakai di semua render views
  res.locals.isLoggedIn = req.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  res.locals.domain = req.domain;
  res.locals.address = req.address;
  res.locals.problemMessage = '';
  res.locals.successMessage = '';
  res.locals.page = '';
  res.locals.pageTitle = 'URL Shortener Indonesia - idurl.id';
  res.locals.metaDescription = 'idurl.id adalah layanan URL Shortener Indonesia. Dengan idurl.id anda bisa membuat custom url anda sendiri secara gratis.';
  res.locals.metaKeywords = 'url shortener, url shortener indonesia, pemendek url, pendekin url, custom url, url, link';
  res.locals.metaAuthor = 'Bagus Anugrah';
  next();
};
