// external modules
const express = require('express');
const bodyParser = require('body-parser');

// internal modules
const pg  = require('../lib/utils/postgresQL')(require('../config/pgconfig'));
const Logger = require('../lib/utils/logging-handler')();


// parameters given to the process
const argv = require('minimist')(process.argv.slice(2));

// create a logger instance for logging API requests
const logger = Logger.createGroupInstance('api-requests', 'api');


// parameters used on the express app
const PORT = argv.PORT || 8080;

// create express app
let app = express();

// configure application
app.use(bodyParser.json());     // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));

// add the public folder
app.use(express.static(__dirname + '/public/'));

// TODO: set the API routes
require('./routes/route.handler')(app, pg, logger);

// start the server
app.listen(PORT, () => logger.info(`server listening on port ${PORT}`));