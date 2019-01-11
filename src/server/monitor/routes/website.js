// configurations
const config = require('../../../config/config');

// external modules
const router = require('express').Router();
const url = require('url');

/**
 * Adds API routes for platform website requests.
 */
module.exports = function (monitor) {

    /**
     * @description Checks if the user is accessing the monitor as an admin.
     * @param {Object} req - The express request object.
     * @param {Object} res - The express response object.
     * @param {Function} next - The express next function - goes to the next appropriate route.
     */
    function isAdmin(req, res, next) {
        const { token } = req.query;
        if (token !== config.monitor.adminToken) {
            return res.redirect(url.format({
                pathname: '/monitor/error',
                query: {
                    errorType: 'non-admin'
                }
            }));
        }
        next();
    }

    /**
     * @api {GET} /monitor Monitor dashboard
     * @apiDescription Gets the monitor dashboard
     * @apiPrivate
     * @apiName GetMonitor
     * @apiGroup Monitor
     *
     * @apiParam {String} adminToken - The token specifying the user is an admin.
     */
    router.get('/monitor', isAdmin, (req, res) => {
        // currently redirect to form page
        monitor.listProcesses((error, processList) => {
            return res.render('index', { processList });
        });
    });

    /**
     * @api {GET} /monior/api/process/:id/stop Monitor stop process
     * @apiDescription Stop the process with the given process id
     * @apiPrivate
     * @apiName GetMonitorStopId
     * @apiGroup Monitor
     *
     * @apiParam {String} id - The id of the process.
     */
    router.get('/monitor/api/process/:id/stop', (req, res) => {
        const id = parseInt(req.params.id);
        monitor.stopProcess(id, (error, status) => {
            if (error) { return res.status(400).send({ error: error.message }); }
            return res.status(200).send(status);
        });
    });

    /**
     * @api {GET} /monitor/api/process/:id/start Monitor start process
     * @apiDescription Starts the process with the given process id
     * @apiPrivate
     * @apiName GetMonitorStartId
     * @apiGroup Monitor
     *
     * @apiParam {String} id - The id of the process.
     */
    router.get('/monitor/api/process/:id/start', (req, res) => {
        const id = parseInt(req.params.id);
        monitor.startProcess(id, (error, status) => {
            if (error) { return res.status(400).send({ error: error.message }); }
            return res.status(200).send(status);
        });
    });

    /**
     * @api {GET} /monitor/error Return the error page
     * @apiPrivate
     * @apiName GetMonitorError
     * @apiGroup Monitor
     */
    router.get('/monitor/error', (req, res) => {
        const { errorType } = req.query;

        let message = null;
        switch(errorType) {
            case 'non-admin':
                message = 'Non-admin user is accessing admin content';
                break;
        }

        return res.render('error', { message, title: 'Missing Path' });
    });

    router.get('/*', (req, res) => {
        return res.render('error', { title: 'Missing Path' });
    });

    return router;
};