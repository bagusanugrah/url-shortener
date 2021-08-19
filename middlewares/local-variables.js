exports.localVariables = (req, res, next) => {// supaya variable bisa dipakai di semua render views
  res.locals.isLoggedIn = req.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  res.locals.domain = req.domain;
  res.locals.address = req.address;
  res.locals.problemMessage = '';
  res.locals.successMessage = '';
  res.locals.page = '';
  next();
};
