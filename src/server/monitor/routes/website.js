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


    router.get('/api/process/:id/stop', (req, res) => {
        const id = parseInt(req.params.id);
        monitor.stopProcess(id, (error, status) => {
            if (error) { return res.status(400).send({ error: error.message }); }
            return res.status(200).send(status);
        });
    });

    router.get('/api/process/:id/start', (req, res) => {
        const id = parseInt(req.params.id);
        monitor.startProcess(id, (error, status) => {
            if (error) { return res.status(400).send({ error: error.message }); }
            return res.status(200).send(status);
        });
    });

    return router;
};