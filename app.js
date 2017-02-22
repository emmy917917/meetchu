/**
 * Module dependencies.
 */
const dotenv = require('dotenv');
const express = require('express');
const passport = require('passport');
const session = require('express-session');
const SequelizeStore = require('express-session-sequelize')(session.Store);
const path = require('path');
const compression = require('compression');
const bodyParser = require('body-parser');
const sass = require('node-sass-middleware');
const flash = require('express-flash');
const validator = require('express-validator');

/**
 * Load environment variables from .env file.
 */
dotenv.load({ path: '.env' });

/**
 * Models.
 */
const models = require('./models');

/**
 * Controllers.
 */
const homeController = require('./controllers/home');
const userController = require('./controllers/user');
const authController = require('./controllers/auth');

/**
 * Passport configuration.
 */
const passportConfig = require('./config/passport');
const sequelizeStore = new SequelizeStore({
  db: models.sequelize
});

/**
 * Express configuration.
 */
const app = express();
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(compression());
app.use(sass({
  src: path.join(__dirname, 'public/scss'),
  dest: path.join(__dirname, 'public/css'),
  prefix: '/css',
  outputStyle: process.env.NODE_ENV === 'production' ? 'compressed' : 'nested'
}));
if (process.env.NODE_ENV !== 'production') {
  app.locals.pretty = true;
}
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  store: sequelizeStore,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7
  },
  saveUninitialized: true,
  resave: true,
  proxy: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});
app.use((req, res, next) => {
    // After successful login, redirect back to the intended page
  if (!req.user &&
      req.path !== '/login' &&
      req.path !== '/signup' &&
      !req.path.match(/^\/auth/) &&
      !req.path.match(/\./)) {
    req.session.returnTo = req.path;
  }
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));

/*
 * App routes.
 */
app.get('/', homeController.index);
app.get('/signup', userController.getSignup);
app.post('/signup', userController.postSignup);
app.get('/login', userController.getLogin);
app.post('/login', userController.postLogin);
app.get('/logout', userController.getLogout);
app.get('/courses', passportConfig.isAuthenticated, userController.getCourses);
app.post('/courses/add', passportConfig.isAuthenticated, userController.postAddCourses);

/**
 * OAuth authentication routes.
 */
app.get('/auth/google', authController.getAuthGoogle);
app.get('/auth/google/callback', authController.getAuthGoogleCallback);

/**
 * Create any missing database tables and start Express server.
 */
models.sequelize.sync().then(() => {
  app.listen(app.get('port'), () => {
    console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
  });
});

module.exports = app;
