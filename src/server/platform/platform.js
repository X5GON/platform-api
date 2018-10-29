/**
 * Runs the X5GON platform server
 */

// configurations
const config = require('../../config/config');

// external modules
const fs = require('fs');
const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');

// internal modules
const pg = require('../../lib/postgresQL')(config.pg);
const Logger = require('../../lib/logging-handler')();

// create a logger instance for logging API requests
const logger = Logger.createGroupInstance('api-requests', 'api');

// create express app
let app = express();

// configure application
app.use(bodyParser.json());     // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));

app.use(session({
    secret: config.platform.sessionSecret,
    resave: true,
    saveUninitialized: true,
    cookie: { domain: '.x5gon.org' }
}));

// add the public folder
app.use(express.static(__dirname + '/public/'));

// set rendering engine
app.engine('hbs', exphbs({
    extname: 'hbs',
    defaultLayout: 'main',
    partialsDir: `${__dirname}/views/partials/`
}));
app.set('view engine', 'hbs');

// redirect specific requests to other services
require('./routes/proxy')(app);

// cookie parser
app.use(cookieParser(config.platform.sessionSecret));

// sets the API routes
require('./routes/route.handler')(app, pg, logger);

// parameters used on the express app
const PORT = config.platform.port;

// start the server without https
const server = app.listen(PORT, () => logger.info(`platform listening on port ${PORT}`));

// export the server for testing
module.exports = server;