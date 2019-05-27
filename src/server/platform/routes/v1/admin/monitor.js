// external modules
const parser = require('ua-parser-js');
const router = require('express').Router();
const url = require('url');

/**
 * Adds API routes for platform website requests.
 */
module.exports = function (monitor, config) {

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
        req.token = token;
        next();
    }

    function updateStatistics(target, list, values, conditions, known=true) {
        // get target values
        let EXISTS = false;
        for (let item of list) {
            // create the condition to be checking
            let condition = true;
            for (let value of conditions) {
                condition = condition && item[value] === target[value];
            }

            if (condition) {
                if (known) {
                    item.known_user += 1;
                } else {
                    item.unknown_user += 1;
                }
                EXISTS = true; break;
            }
        }
        if (!EXISTS) {
            // create object to be added to the list
            let object = { };
            for (let value of values) {
                object[value] = target[value];
            }
            if (known) {
                object.known_user = 1;
                object.unknown_user = 0;
            } else {
                object.known_user = 0;
                object.unknown_user = 1;
            }
            list.push(object);
        }
    }


    router.get('/monitor', isAdmin, (req, res) => {
        // currently redirect to form page
        res.redirect(`/monitor/process?token=${req.token}`);
    });

    /**
     * @api {GET} /monitor/process Monitor dashboard
     * @apiDescription Gets the monitor dashboard
     * @apiPrivate
     * @apiName GetMonitor
     * @apiGroup Monitor
     *
     * @apiParam {String} adminToken - The token specifying the user is an admin.
     */
    router.get('/monitor/process', isAdmin, (req, res) => {
        // currently redirect to form page
        monitor.listProcesses((error, processList) => {
            return res.render('monitor-process', {
                layout: 'main-monitor',
                title: 'Process Monitor',
                token: req.token,
                processList
            });
        });
    });

    router.get('/monitor/snippet', isAdmin, (req, res) => {
        // user activity statistics
        let statistics = {
            browsers: [],
            engines: [],
            os: [],
            devices: []
        };

        // currently redirect to form page
        pg.selectLarge({ }, 'client_activity', 10, (error, results) => {
            for (let log of results) {
                // get user id and user-agent from the log
                const { uuid, useragent } = log;
                // check if the log is a bot
                let isBot = useragent.toLowerCase().includes('bot');
                let isPreview = useragent.toLowerCase().includes('preview');
                if (isBot || isPreview) { continue; }

                // parse the user agent
                const {
                    browser,
                    engine,
                    os,
                    device
                } = parser(useragent);

                const known = !uuid.includes('unknown');
                updateStatistics(browser, statistics.browsers, ['name'], ['name'], known);
                updateStatistics(engine, statistics.engines,   ['name'], ['name'], known);
                updateStatistics(os, statistics.os,            ['name'], ['name'], known);
                updateStatistics(device, statistics.devices,   ['type'], ['type'], known);
            }
        }, (error) => {
            return res.render('monitor-snippet', {
                layout: 'main-monitor',
                title: 'Snippet Monitor',
                token: req.token,
                statistics
            });
        });

    });

    router.get('/monitor/materials', isAdmin, (req, res) => {
        // currently redirect to form page
        monitor.listProcesses((error, processList) => {
            return res.render('monitor-materials', {
                layout: 'main-monitor',
                title: 'Material Monitor',
                token: req.token,
                processList
            });
        });
    });

    return router;
};