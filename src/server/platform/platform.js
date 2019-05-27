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

// create a logger for platform requests
const logger = Logger.createGroupInstance('requests', 'platform', config.environment === 'dev');

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

// sets the API routes
require('./routes/route.handler')(app, pg, logger, config, passport, /*, monitor */);

// // internal modules for monitoring processes
// const PM2Monitor = require('alias:lib/pm2-monitor');
// let monitor = new PM2Monitor();
// // initialize socket
// let io = require('socket.io')(http);
// // configure socket connections
// io.on('connection', function(socket) {
//     console.log('a user connected');
//     socket.on('disconnect', function () {
//         console.log('user disconnected');
//     });

//     setInterval(() => {
//         monitor.listProcesses((error, list) => {
//             return error ?
//                 io.emit('pm2-process-error', { error }) :
//                 io.emit('pm2-process', list);
//         });
//     }, 1000);
// });

// parameters used on the express app
const PORT = config.platform.port;
// start the server without https
const server = http.listen(PORT, () => logger.info(`platform listening on port ${PORT}`));

// export the server for testing
module.exports = server;