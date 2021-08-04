exports.getLogin = (req, res, next) => {
  res.render('login', {
    pageTitle: 'Login',
    problemMessage: 'Invalid email!',
    successMessage: 'Verifikasi email berhasil!',
  });
};

exports.getRegister = (req, res, next) => {
  res.render('register', {
    pageTitle: 'Sign Up',
    problemMessage: '',
    successMessage: 'Registrasi berhasil! Silahkan cek email inbox anda untuk verifikasi email.',
  });
};

exports.getReset = (req, res, next) => {
  res.render('reset-password', {
    pageTitle: 'Reset Password',
    problemMessage: 'Invalid email!',
  });
};
