require('dotenv').config();// supaya bisa akses variabel dari file .env dengan process.env.VARIABEL
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const csrf = require('csurf');
const multer = require('multer');

const {sequelize, User} = require('./models');
const mainRoutes = require('./routes/main');
const authRoutes = require('./routes/auth');
const errorController = require('./controllers/error');
const {error500} = require('./functions/errors');
const {dataRemover} = require('./middlewares/dataRemover');
const {localVariables} = require('./middlewares/local-variables');

const app = express();
const port = process.env.PORT;
const hostname = process.env.NODE_ENV === 'development' ? 'localhost' : process.env.HOSTNAME;

const myStore = new SequelizeStore({
  db: sequelize,
  checkExpirationInterval: 1000*60*10, // expired session akan dihapus dari database (dalam milliseconds)
});
const csrfProtection = csrf();

const fileStorage = multer.diskStorage({// mendeklarasikan penyimpanan untuk file upload
  destination: (req, file, callback) => {// lokasi penyimpanan
    callback(null, path.join(__dirname, 'upload/images'));
  },
  filename: (req, file, callback) => {// nama file yang akan disimpan
    callback(null, `screenshot-${new Date().toISOString()}-${file.originalname}` );
  },
});

app.set('view engine', 'ejs');// registrasi template engine
app.set('views', 'views');// lokasi file yang ingin dirender oleh template engine

app.use(bodyParser.urlencoded({extended: false}));
// middleware bodyParser.urlencoded() memparsing body request sebelum menjalankan next()
// bodyparser akan mengambil data dari form dan datanya bisa diakses dari req.body.formName
app.use(multer({
  limits: {
    fieldSize: 1024 * 3000, // max file upload 3MB untuk multer (default 1MB), tapi untuk server belum tentu bisa
    fieldNameSize: 500, // 500 bytes (default 100 bytes)
  },
  storage: fileStorage}).single('screenshot'));// langsung menyimpan file di storage

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'seo')));
app.use('/donasi', express.static(path.join(__dirname, 'public/img/donasi')));
app.use('/upload/images', express.static(path.join(__dirname, 'upload/images')));// supaya file bisa diakses oleh client

app.use(
    session({
      secret: 'xu9Ic1K4U9ZX',
      store: myStore,
      resave: false,
      saveUninitialized: false,
      proxy: true,
    }),
);
myStore.sync();
app.use(csrfProtection);// csrfProtection berguna untuk melindungi setiap request (selain get) dari CSRF Attack
// csrf didaftarkan setelah session karena csrf akan menggunakan session tersebut

app.use(async (req, res, next) => {// ditaruh di atas semua routes agar req.propertyBaru bisa digunakan di semua routes
  try {
    const protocol = process.env.PROTOCOL;
    const domain = process.env.DOMAIN;
    const address = process.env.NODE_ENV === 'development' ?
    `${protocol}://${domain}:${port}` : `${protocol}://${domain}`;

    req.domain = domain;
    req.address = address;

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
    error500(error, next);
  }
});

app.use(localVariables);// supaya variable bisa dipakai di semua render views
app.use(dataRemover);// penghapus otomatis

app.use(errorController.getUnderConstruction);

/**
authRoutes diletakkan di atas mainRoutes supaya routes semisal /login, /register, dll bisa ditemukan (tidak 404)
karena di mainRoutes ada controller getRedirect yang mana kalo /:parameter tidak ada di database maka akan
menjadi 404. Di express, routes /spesifik harus diletakkan sebelum routes /:parameter.
 */
app.use(authRoutes);
app.use(mainRoutes);

app.use(errorController.get404);

app.use(errorController.get500);

app.listen(port, hostname, async () => {
  console.log('Server is running');
  await sequelize.sync();
  console.log('CONNECTED TO THE DATABASE');
});
