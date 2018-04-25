/**
 * Runs the X5GON recommendation engine
 */


// external modules
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

// internal modules
const pg = require('../../lib/postgresQL')(require('../../config/pgconfig'));
const Logger = require('../../lib/logging-handler')();

// parameters given to the process
const argv = require('minimist')(process.argv.slice(2));

// create a logger instance for logging API requests
const logger = Logger.createGroupInstance('recsys-requests', 'api');

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
const PORT = argv.PORT || 3000;

// start the server
app.listen(PORT, () => logger.info(`recsys listening on port ${PORT}`));