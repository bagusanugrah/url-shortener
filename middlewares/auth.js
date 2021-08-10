exports.isGuest = (req, res, next) => {
  if (req.isLoggedIn) {// jika user logged in
    return res.redirect('/');
  }
  next();// lanjut ke middleware/controller berikutnya
};
