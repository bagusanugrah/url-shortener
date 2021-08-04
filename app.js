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
  checkExpirationInterval: 10 * 60 * 1000, // expired session akan dihapus dari database (dalam milliseconds)
});
const csrfProtection = csrf();

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
    session({
      secret: 'xu9Ic1K4U9ZX',
      store: myStore,
      resave: false,
      proxy: true,
    }),
);
app.use(csrfProtection);
app.use(flash());

myStore.sync();

app.use((req, res, next) => {// supaya variable bisa dipakai di semua render views
  res.locals.isAuthenticated = req.session.isLoggedIn;
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

app.use(authRoutes);
app.use(mainRoutes);

app.get('/500', errorController.get500);
app.use(errorController.get404);

app.use((error, req, res, next) => {
  // res.redirect('/500');
  res.status(error.httpStatusCode).render('500', {
    pageTitle: 'Technical Error!',
    path: '/500',
  });
});

app.listen({port: 5000}, async () => {
  console.log('Server is running');
  await sequelize.authenticate();
  console.log('CONNECTED TO THE DATABASE');
});
