// external modules
const router = require('express').Router();

/**
 * Adds API routes for platform website requests.
 */
module.exports = function (monitor) {

    router.get('/', (req, res) => {
        // currently redirect to form page
        monitor.listProcesses((error, processList) => {
            res.render('index', { processList });
        });
    });

    return router;
};