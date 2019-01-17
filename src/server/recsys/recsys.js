/**
 * Runs the X5GON recommendation engine
 */

// configurations
const config = require('../../config/config');

// external modules
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

// internal modules
const pg = require('../../lib/postgresQL')(config.pg);
const Logger = require('../../lib/logging-handler')();
const dbUpdate = require('../../load/create-postgres-tables');

// get process environment
const env = process.env.NODE_ENV;
// create a logger instance for logging API requests
const logger = Logger.createGroupInstance(`recsys-requests-${env}`, 'api', env !== 'test');

// create express app
let app = express();

// configure application
app.use(bodyParser.json());     // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));
app.use(cookieParser()); // cookie parser

// sets the API routes
app.use('/api/v1/', require('./routes/recommendations')(pg, logger));

// parameters used on the express app
const PORT = config.recsys.port;

// start the server
const server = function(callback) {
    logger.info("Starting DB update.");
    dbUpdate.startDBCreate(function () {
        logger.info("Starting the server");
        app.listen(PORT, () => logger.info(`recsys listening on port ${PORT}`));
        if (callback) {
            callback();
        }
    });
};

// export the server for testing
module.exports = server();