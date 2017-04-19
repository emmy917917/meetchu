const passport = require('passport');
const auth = require('./auth');
const async = require('async');
const crypto = require('crypto');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const algoliasearch = require('algoliasearch');
const pug = require('pug');
const Promise = require('bluebird');
const monet = require('monet');
const Either = monet.Either;
const Maybe = monet.Maybe;

const models = require('../models');
const personDao = require('../dao/person')(models);

/**
 * Load environment variables from .env file
 */
dotenv.load({ path: '.env', silent: process.env.NODE_ENV === 'production' });

/**
 * Nodemailer transport configuration.
 */
const transporter = nodemailer.createTransport({
  service: 'SendGrid',
  auth: {
    user: process.env.SENDGRID_USERNAME,
    pass: process.env.SENDGRID_PASSWORD
  }
});

/**
 * Algolia configuration.
 */
const client = algoliasearch(process.env.ALGOLIA_ID, process.env.ALGOLIA_ADMIN_KEY);
const userIndex = client.initIndex('users');

/**
 * GET /signup
 * Sign up page.
 */
exports.getSignup = (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  return res.render('account/signup', {
    title: 'Sign up'
  });
};

/**
 * Adds a new user to algolia.
 * @param {User} user - a user model.
 * @return {Promise} a bluebird promise.
 */
function addUserToAlgolia(user) {
  // Add user to Algolia index
  const userValues = {
    objectID: user.dataValues.id,
    firstName: user.dataValues.firstName,
    lastName: user.dataValues.lastName,
    email: user.dataValues.email
  };
  return Promise.resolve(userIndex.addObjects([userValues]));
}

/**
 * POST /signup
 * User signup.
 */
exports.postSignup = (req, res, next) => {
  req.assert('email', 'Email is not valid.').isEmail();
  req.assert('password', 'Password must be at least 4 characters long.').len(4);
  req.assert('confirmPassword', 'Passwords do not match.').equals(req.body.password);
  req.sanitize('email').normalizeEmail({ remove_dots: false });

  passport.authenticate('signup', (err, user) => {
    if (err) {
      req.flash('error', err);
      return res.status(401).json(err);
    }
    return res.status(200).json(user);
  })(req, res, next);
};

/**
 * POST /login
 * User login.
 */
exports.postLogin = (req, res, next) => {
  auth.loginCallback('login', req, res, next);
};

/**
 * GET /logout
 * Log out.
 */
exports.getLogout = (req, res) => {
  req.logout();
  req.session.destroy(() => {
    res.redirect('/');
  });
};

/**
 * POST /account/update
 * Update account information.
 */
exports.postUpdateAccount = (req, res) => {
  const person = new models.Person(req.body.user);
  const fields = req.body.fields;

  person.updatePassword(person.password);

  personDao.update(person, fields).tap(result =>
    result.cata(
      err => res.status(401).json(err),
      wasUpdated => res.status(200).json(person)
    )
  );
};

/**
 * GET /profile/:id
 * Get user public profile.
 */
exports.getProfile = (req, res) => {
  const person = new models.Person(req.body.user);
  const fields = req.body.fields;
  
  personDao.findById(person, fields).tap(result =>
    result.cata(
      err => res.status(401).json(err),
      wasUpdated => res.status(200).json(person)
    )
  );
};

/**
 * POST /account/delete
 * Delete user account.
 */
exports.postDeleteAccount = (req, res, next) => {
  const person = req.body.user;

  personDao.erase(person).tap(result =>
    result.cata(
      err => res.status(401).json(err),
      rowsChanged => res.status(200).json(rowsChanged)
    )
  );
};
