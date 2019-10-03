/**
 * Runs the X5GON recommendation engine
 */
require('module-alias/register');

// configurations
const config = require('@config/config');

// external modules
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

// internal modules
const pg = require('@library/postgresQL')(config.pg);
const Logger = require('@library/logger');

// create a logger instance for logging API requests
const { environment } = config;
const logger = Logger.createGroupInstance('requests', 'recsys', environment !== 'prod');

// create express app
let app = express();

// configure application
app.use(bodyParser.json());     // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));
app.use(cookieParser()); // cookie parser

// sets the API routes
app.use('/api/v1/', require('./routes/recommendations')(pg, logger, config));

// parameters used on the express app
const PORT = config.recsys.port;

// start the server without https
const server = app.listen(PORT, () => logger.info(`recsys listening on port ${PORT}`));

// export the server for testing
module.exports = server;