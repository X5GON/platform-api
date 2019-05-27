// external modules
const router = require('express').Router();
const request = require('request');

/**
 * @description Adds API routes for platform website requests.
 * @param {Object} pg - Postgres connection wrapper.
 * @param {Object} logger - The logger object.
 * @param {Object} config - The configuration object.
 */
module.exports = function (pg, logger, config, passport) {


    function _checkAuthentication(req, res, next) {
        // if user is authenticated in the session, carry on
        if (req.isAuthenticated()) { return next(); }
        // they aren't, redirect them to the admin login
        res.redirect('/admin-login');
    }


    router.get('/admin-login', (req, res) => {
        // if user is authenticated in the session, continue to admin
        if (req.isAuthenticated()) {
            return res.redirect('/admin');
        }

        // return the admin login page
        return res.render('admin-login', {
            layout: 'submain',
            title: 'Admin Login',
            message: req.flash('error')
        });
    });

    router.post('/admin-login',
        // return the admin login page
        passport.authenticate('local', {
            successRedirect: '/admin',
            failureRedirect: '/admin-login',
            failureFlash: 'Invalid username or password.'
        })
    );



    router.get('/admin', _checkAuthentication, (req, res) => {
        // return the admin login page
        return res.render('admin', {
            layout: 'submain',
            title: 'Admin'
        });
    });

    return router;
}
