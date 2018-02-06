// external modules
const express = require('express');
const bodyParser = require('body-parser');

// internal modules
const pg  = require('../lib/postgresQL')(require('../config/pgconfig'));
const Logger = require('../lib/loggingHandler')();


// parameters given to the process
const argv = require('minimist')(process.argv.slice(2));

// create a logger instance for logging API requests
const logger = Logger.createGroupInstance('api_requests', 'api');


// parameters used on the express app
const PORT = argv.PORT || 7110;

// create express app
let app = express();

// configure application
app.use(bodyParser.json());     // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));


// TODO: set the API routes
// require('./routes/route.handler')(app, pg);

// start the server
app.listen(PORT, () => logger.info(`server listening on port ${PORT}`));