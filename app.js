/**
 * Module dependencies
 */
const dotenv = require('dotenv');
const express = require('express');
const path = require('path');
const webpack = require('webpack');
const compression = require('compression');
const bodyParser = require('body-parser');

/**
 * Webpack configuration
 */
const webpackConfig = require('./webpack.config.js');
const compiler = webpack(webpackConfig);

/**
 * Load environment variables from .env file
 */
dotenv.load({ path: '.env' });

/**
 * Models
 */
const models = require('./models');

/**
 * Controllers
 */
const homeController = require('./controllers/home');
const userController = require('./controllers/user');

/**
 * Express configuration
 */
const app = express();

app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(require("webpack-dev-middleware")(compiler, {
    noInfo: true, publicPath: webpackConfig.output.publicPath
}));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));

/*
 * Define app routes
 */
app.get('/', homeController.index);
app.get('/login', userController.getLogin);
app.post('/login', userController.postLogin);

/**
 * Create any missing database tables and start Express server
 */
models.sequelize.sync().then(() => {
  app.listen(app.get('port'), () => {
    console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
  });

  // Database test
  models.User.findOrCreate({
    where: {
      email: 'student@purdue.edu',
      firstName: 'Jack',
      lastName: 'Smith',
    }
  }).spread((user, userCreated) => {
    console.log('Found user: ' + user.emailFullName);
    models.Group.findOrCreate({
      where: {
        name: 'CS 252 Students',
        groupType: 'group',
        description: 'A study group for CS 252 students'
      }
    }).spread((group, groupCreated) => {
      user.setGroup(group);
    });
  });
});

module.exports = app;