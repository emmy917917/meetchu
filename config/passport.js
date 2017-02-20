/**
 * Module dependencies.
 */
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const models = require('../models');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  models.User.find({ where: { id } }).then((user) => {
    done(null, user);
  }).catch((err) => {
    done(err, null);
  });
});

/**
 * Sign in using email and password.
 */
passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
  models.User.find({ where: { email } }).then((user) => {
    if (!user) {
      done(null, false, { message: `Email #{email} not found.` });
    }
    user.verifyPassword(password, (err, isMatch) => {
      if (err) { return done(err); }
      if (isMatch) {
        return done(null, user);
      }
      return done(null, false, { msg: 'Invalid email or password.' });
    });
  }).catch((err) => {
    done(err);
  });
}));

/**
 * Middleware required for login.
 */
exports.isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.redirect('/login');
};