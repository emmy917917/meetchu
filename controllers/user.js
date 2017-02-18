const models = require('../models');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

/**
 * GET /login
 * Login page.
 */
exports.getLogin = (req, res) => {
  res.render('login', {
    title: 'Login',
  });
};

/**
 * POST /login
 * User login.
 */
exports.postLogin = (req, res) => {
  // Sample function
  console.log(req.body);
  // res.json(req.body);
  res.redirect('/');
};
