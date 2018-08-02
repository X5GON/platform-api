// external modules
const router = require('express').Router();

/**
 * Adds API routes for platform website requests.
 */
module.exports = function () {

    router.get('/', (req, res) => {
        // currently redirect to form page
        res.render('index', { });
    });

    return router;
};