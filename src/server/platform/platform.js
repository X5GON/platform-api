/**
 * Runs the X5GON platform server
 */

// external modules
const express      = require('express');
const bodyParser   = require('body-parser');
const cookieParser = require('cookie-parser');
const session      = require('express-session');
const passport     = require('passport');
const flash        = require('connect-flash');
// configurations
const config = require('alias:config/config');

// internal modules
const pg     = require('alias:lib/postgresQL')(config.pg);
const Logger = require('alias:lib/logger');
const Monitor = require('alias:lib/process-monitor');

// create a logger for platform requests
const logger = Logger.createGroupInstance('requests', 'platform', config.environment === 'dev');
// create process monitoring instance
const monitor = new Monitor();

// create express app
let app = express();
let http = require('http').Server(app);

// add the public folder
app.use(express.static(__dirname + '/public/'));
// add session configurations
app.set('trust proxy', 1);
app.use(session({
    secret: config.platform.sessionSecret,
    saveUninitialized: true,
    resave: true,
    cookie: {
        secure: config.environment === 'prod',
        ...(config.environment === 'prod' && { domain: '.x5gon.org' })
    }
}));
// configure application
app.use(bodyParser.json());     // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));
// andd handlebars configurations
require('./config/handlebars')(app);
// redirect specific requests to other services
require('./routes/proxies')(app, config);
// configure cookie parser
app.use(cookieParser(config.platform.sessionSecret));
app.use(flash());
// initialize authentication
app.use(passport.initialize());
app.use(passport.session({ secret: config.platform.sessionSecret }));
// passport configuration
require('./config/passport')(passport, pg);
// socket.io configuration
require('./config/sockets')(http, monitor);

// sets the API routes - adding the postgresql connection, logger, config file,
// passport object (for authentication), and monitoring object
require('./routes/route.handler')(app, pg, logger, config, passport, monitor);

// parameters used on the express app
const PORT = config.platform.port;
// start the server without https
const server = http.listen(PORT, () => logger.info(`platform listening on port ${PORT}`));

// export the server for testing
module.exports = server;