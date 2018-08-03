// external modules
const router = require('express').Router();
const url = require('url');
// configurations
const config = require('../config/adminconfig');

/**
 * Adds API routes for platform website requests.
 */
module.exports = function (monitor) {

    function isAdmin(req, res, next) {
        const { token } = req.query;
        if (token !== config.adminToken) {
            return res.redirect(url.format({
                pathname: '/monitor/error',
                query: {
                    errorType: 'non-admin'
                }
            }));
        }
        next();
    }

    router.get('/monitor', isAdmin, (req, res) => {
        // currently redirect to form page
        monitor.listProcesses((error, processList) => {
            return res.render('index', { processList });
        });
    });

    router.get('/monitor/api/process/:id/stop', (req, res) => {
        const id = parseInt(req.params.id);
        monitor.stopProcess(id, (error, status) => {
            if (error) { return res.status(400).send({ error: error.message }); }
            return res.status(200).send(status);
        });
    });

    router.get('/monitor/api/process/:id/start', (req, res) => {
        const id = parseInt(req.params.id);
        monitor.startProcess(id, (error, status) => {
            if (error) { return res.status(400).send({ error: error.message }); }
            return res.status(200).send(status);
        });
    });

    router.get('/monitor/error', (req, res) => {
        const { errorType } = req.query;

        let message = null;
        switch(errorType) {
            case 'non-admin':
                message = 'Non-admin user is accessing admin content';
                break;
        }

        return res.render('error', { message });
    });

    router.get('/*', (req, res) => {
        return res.render('error', { });
    });

    return router;
};