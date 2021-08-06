const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const {Op} = require('sequelize');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const csrf = require('csurf');
const flash = require('connect-flash');

const {sequelize, GuestShortenedUrl, User, EmailVerification, PasswordReset} = require('./models');
const mainRoutes = require('./routes/main');
const authRoutes = require('./routes/auth');
const errorController = require('./controllers/error');

const app = express();

const myStore = new SequelizeStore({
  db: sequelize,
  checkExpirationInterval: 1000*60*10, // expired session akan dihapus dari database (dalam milliseconds)
});
const csrfProtection = csrf();

app.set('view engine', 'ejs');// registrasi template engine
app.set('views', 'views');// lokasi file yang ingin dirender oleh template engine

app.use(bodyParser.urlencoded({extended: false}));
// middleware bodyParser.urlencoded() memparsing body request sebelum menjalankan next()
// bodyparser akan mengambil data dari form dan datanya bisa diakses dari req.body.formName
app.use(express.static(path.join(__dirname, 'public')));

app.use(
    session({
      secret: 'xu9Ic1K4U9ZX',
      store: myStore,
      resave: false,
      proxy: true,
    }),
);
myStore.sync();
app.use(csrfProtection);// csrfProtection berguna untuk melindungi setiap request (selain get) dari CSRF Attack
// csrf didaftarkan setelah session karena csrf akan menggunakan session tersebut
app.use(flash());// flash didaftarkan setelah session karena flash akan menggunakan session tersebut

app.use(async (req, res, next) => {// ditaruh di atas semua routes agar req.propertyBaru bisa digunakan di semua routes
  try {
    if (req.session.user) {// user dalam keadaan logged in
      const user = await User.findOne({where: {id: req.session.user.id}});// cari user di database
      req.loggedInUser = user;
      req.isLoggedIn = req.session.isLoggedIn;
      next();
    } else {// user tidak dalam keadaan logged in
      req.loggedInUser = null;
      req.isLoggedIn = false;
      next();
    }
  } catch (error) {
    console.log(error);
    const err = new Error(error);
    err.httpStatusCode = 500;
    return next(err);
  }
});

app.use((req, res, next) => {// supaya variable bisa dipakai di semua render views
  res.locals.isLoggedIn = req.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use(async (req, res, next) => {// penghapus otomatis
  await GuestShortenedUrl.destroy({
    where: {
      expiredAt: {
        [Op.lt]: Date.now(),
      },
    },
  });
  next();
});

app.use(async (req, res, next) => {// penghapus otomatis
  await EmailVerification.destroy({
    where: {
      expiredAt: {
        [Op.lt]: Date.now(),
      },
    },
  });
  next();
});

app.use(async (req, res, next) => {// penghapus otomatis
  await PasswordReset.destroy({
    where: {
      expiredAt: {
        [Op.lt]: Date.now(),
      },
    },
  });
  next();
});

app.use(async (req, res, next) => {// penghapus otomatis
  await User.destroy({
    where: {
      expiredAt: {
        [Op.lt]: Date.now(),
      },
    },
  });
  next();
});

/**
authRoutes diletakkan di atas mainRoutes supaya routes semisal /login, /register, dll bisa ditemukan (tidak 404)
karena di mainRoutes ada controller getRedirect yang mana kalo /:parameter tidak ada di database maka akan
menjadi 404. Di express, routes /spesifik harus diletakkan sebelum routes /:parameter.
 */
app.use(authRoutes);
app.use(mainRoutes);

app.get('/500', errorController.get500);
app.use(errorController.get404);

app.use((error, req, res, next) => {// middleware ini dijalankan ketika terjadi error
  // res.redirect('/500');
  const statusCode = error.httpStatusCode ? error.httpStatusCode : 500;
  res.status(statusCode).render('500', {
    pageTitle: 'Technical Error!',
    path: '/500',
  });
});

app.listen({port: 5000}, async () => {
  console.log('Server is running');
  await sequelize.sync();
  console.log('CONNECTED TO THE DATABASE');
});
