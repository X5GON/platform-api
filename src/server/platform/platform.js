/**
 * Runs the X5GON platform server
 */

require('module-alias/register');

// external modules
const gatsbyExpress = require('gatsby-plugin-express');
const express      = require('express');
const bodyParser   = require('body-parser');
const cookieParser = require('cookie-parser');
const session      = require('express-session');
const passport     = require('passport');
const flash        = require('connect-flash');
// configurations
const config = require('@config/config');

// internal modules
const pg     = require('@library/postgresQL')(config.pg);
const Logger = require('@library/logger');
const Monitor = require('@library/process-monitor');

// create a logger for platform requests
const logger = Logger.createGroupInstance('requests', 'platform', config.environment !== 'prod');
// create process monitoring instance
const monitor = new Monitor();

// create express app
let app = express();
let http = require('http').Server(app);

// add the public folder
app.use(express.static(__dirname + '/public/'));
// configure application
app.use(bodyParser.json());     // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));
// redirect specific requests to other services
require('./routes/proxies')(app, config);
// configure cookie parser
app.use(cookieParser(config.platform.sessionSecret));

// add session configurations
if (config.environment === 'prod') {
    app.set('trust proxy', 1);
}
app.use(session({
    secret: config.platform.sessionSecret,
    saveUninitialized: false,
    resave: false,
    // cookie: {
    //     ...(config.environment === 'prod' && { domain: '.x5gon.org' })
    // }
}));
// use flash messages
app.use(flash());
// initialize authentication
app.use(passport.initialize());
app.use(passport.session({ secret: config.platform.sessionSecret }));
// passport configuration
require('./config/passport')(passport, pg);
// socket.io configuration
require('./config/sockets')(http, monitor);
// add handlebars configurations
require('./config/handlebars')(app);

// sets the API routes - adding the postgresql connection, logger, config file,
// passport object (for authentication), and monitoring object
require('./routes/route.handler')(app, pg, logger, config, passport, monitor);

const frontEndPath = `${__dirname}/frontend`;
app.use(express.static(`${frontEndPath}/public`))
app.use(gatsbyExpress(`${frontEndPath}/gatsby-express.json`, {
    publicDir: `${frontEndPath}/public`,
    // redirects all /path/ to /path
    // should be used with gatsby-plugin-remove-trailing-slashes
    redirectSlashes: true
}));

// parameters used on the express app
const PORT = config.platform.port;
// start the server without https
const server = http.listen(PORT, () => logger.info(`platform listening on port ${PORT}`));

// export the server for testing
module.exports = server;