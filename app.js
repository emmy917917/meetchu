/**
 * Module dependencies.
 */
const dotenv = require('dotenv');
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const passport = require('passport');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');
const compression = require('compression');
const bodyParser = require('body-parser');
const logger = require('morgan');
const sass = require('node-sass-middleware');
const flash = require('express-flash');
const validator = require('express-validator');
const nodemailer = require('nodemailer');

/**
 * Load environment variables from .env file.
 */
if (process.env.NODE_ENV !== 'production') {
  dotenv.load({ path: '.env' });
}

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
const chatController = require('./controllers/chats');
const meetingController = require('./controllers/meetings');
const courseController = require('./controllers/courses');
const notificationController = require('./controllers/notification');

/**
 * Passport configuration.
 */
const passportConfig = require('./config/passport');
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  schema: {
    tableName: 'Sessions'
  }
});

/**
 * Express configuration.
 */
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
app.use(logger('dev'));
if (process.env.NODE_ENV !== 'production') {
  app.locals.pretty = true;
}
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(validator({
  customValidators: {
    isArray(value) {
      console.log('value: ' + value);
      console.log('isArray: ' + Array.isArray(value));
      return Array.isArray(value);
    },
    notEmptyArray(value) {
      return Array.isArray(value) && value.length > 0;
    },
    notEmptyObjArray(obj) {
      if (obj === null || typeof obj !== 'object') {
        return false;
      }
      Object.keys(obj).map((key) => {
        if (!Array.isArray(obj[key]) || obj[key] === 0) {
          return false;
        }
      });
      return true;
    }
  }
}));
app.use(session({
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
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
  // Force responses with code 304 to have code 200
  req.headers['if-none-match'] = 'no-match-for-this';
  // Save last visited valid page
  req.on('end', () => {
    if (res.statusCode === 200 && req.path !== '/login' && req.path !== '/signup' && !req.path.match(/^\/reset/)
        && !req.path.match(/^\/auth/) && !req.path.match(/\./)) {
      req.session.returnTo = req.path;
      req.session.save();
    }
  });
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
app.get('/account', passportConfig.isAuthenticated, userController.getProfile);
app.post('/account/profile', passportConfig.isAuthenticated, userController.postUpdateProfile);
app.post('/account/password', passportConfig.isAuthenticated, userController.postUpdatePassword);
app.post('/account/delete', passportConfig.isAuthenticated, userController.postDeleteAccount);
app.get('/profile/:id', passportConfig.isAuthenticated, userController.getPublicProfile);
app.post('/profile/:id/chat', passportConfig.isAuthenticated, userController.postPublicProfileCreateChat);
app.get('/forgot', userController.getForgot);
app.post('/forgot', userController.postForgot);
app.get('/reset/:token', userController.getPasswordReset);
app.post('/reset/:token', userController.postPasswordReset);
app.get('/chats', passportConfig.isAuthenticated, chatController.getChats);
// temp
app.get('/chats/proto', passportConfig.isAuthenticated, chatController.getProto);
//----
app.get('/chats/:id', passportConfig.isAuthenticated, chatController.getChat);
app.post('/chats/create', passportConfig.isAuthenticated, chatController.postCreateChatGroup);
app.post('/chats/:id/invite', passportConfig.isAuthenticated, chatController.postInviteChatGroup);
app.post('/chats/:id/leave', passportConfig.isAuthenticated, chatController.postLeaveChatGroup);

app.post('/chats/:id/delete', passportConfig.isAuthenticated, chatController.postDeleteChatGroup);
app.get('/courses', passportConfig.isAuthenticated, courseController.getCourses);
app.get('/courses/:id', passportConfig.isAuthenticated, courseController.getCourse);
app.post('/courses/add', passportConfig.isAuthenticated, courseController.postAddCourse);
app.post('/courses/remove/:id', passportConfig.isAuthenticated, courseController.postRemoveCourse);
app.post('/courses/auth', passportConfig.isAuthenticated, courseController.postAuthCourses);
app.get('/meetings', passportConfig.isAuthenticated, meetingController.getMeetings);
app.get('/meetings/:id', passportConfig.isAuthenticated, meetingController.getMeeting);
app.post('/meetings/create', passportConfig.isAuthenticated, meetingController.postCreateMeeting);
app.post('/meetings/:id/invite', passportConfig.isAuthenticated, meetingController.postInviteMeeting);
app.post('/meetings/:id/update', passportConfig.isAuthenticated, meetingController.postUpdateMeeting);
app.post('/meetings/:id/rsvp', passportConfig.isAuthenticated, meetingController.postRsvpMeeting);
app.post('/meetings/:id/finalize', passportConfig.isAuthenticated, meetingController.postFinalizeMeeting);
app.post('/meetings/:id/unfinalize', passportConfig.isAuthenticated, meetingController.postUnfinalizeMeeting);
app.post('/meetings/:id/delete', passportConfig.isAuthenticated, meetingController.postDeleteMeeting);

app.post('/notifications/create', passportConfig.isAuthenticated, notificationController.createNotification);

/**
 * OAuth authentication routes.
 */
app.get('/auth/google', authController.getAuthGoogle);
app.get('/auth/google/callback', authController.getAuthGoogleCallback);
app.get('/auth/facebook', authController.getAuthFacebook);
app.get('/auth/facebook/callback', authController.getAuthFacebookCallback);

/**
 * Socket.io configuration.
 */
io.on('connection', (socket) => {
  socket.on('send message', (rec) => {
    models.Message.create({
      senderId: rec.senderId,
      groupId: rec.groupId,
      message: rec.message.body
    });
    io.emit(`receive message ${rec.groupId}`, rec.message);
  });
});

/**
 * Create any missing database tables and start Express server.
 */
models.sequelize.sync().then(() => {
  http.listen(app.get('port'), () => {
    console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
  });
});

module.exports = app;
