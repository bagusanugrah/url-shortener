exports.isGuest = (req, res, next) => {
  if (req.loggedInUser) {// jika user logged in
    return res.redirect('/');
  }
  next();// lanjut ke middleware/controller berikutnya
};
