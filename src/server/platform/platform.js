/**
 * Runs the X5GON platform server
 */

// external modules
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

// internal modules
const pg = require('../../lib/postgresQL')(require('../../config/pgconfig'));
const Logger = require('../../lib/logging-handler')();

// create a logger instance for logging API requests
const logger = Logger.createGroupInstance('api-requests', 'api');

// create a cluster of servers
const cluster = require('cluster');

if (cluster.isMaster) {
    // master process handles communication with children
    const numberOfWorkers = 4; // magic number - set it heigher if needed

    logger.info(`Master cluster setting up ${numberOfWorkers} workers...`);

    // create number of workers equal to number of free cpus
    for (let i = 0; i < numberOfWorkers; i++) {
        cluster.fork();
    }

    // set communitcation with online worker
    cluster.on('online', function(worker) {
        logger.info(`Worker ${worker.process.pid} is online`);
    });

    // set communication with worker that died
    cluster.on('exit', function(worker, code, signal) {
        logger.warn(`Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}. Starting a new worker...`);
        cluster.fork();
    });


} else {
    // this is a child process

    // parameters given to the process
    const argv = require('minimist')(process.argv.slice(2));

    // create express app
    let app = express();

    // configure application
    app.use(bodyParser.json());     // to support JSON-encoded bodies
    app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
        extended: true
    }));

    // add the public folder
    app.use(express.static(__dirname + '/public/'));

    // TODO: handle redirections - using proxy

    // cookie parser
    app.use(cookieParser());

    // sets the API routes
    require('./routes/route.handler')(app, pg, logger);

    // parameters used on the express app
    const PORT = argv.PORT || 8080;

    // start the server
    app.listen(PORT, () => logger.info(`platform listening on port ${PORT}`));
}