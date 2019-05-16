/**
 * Runs the X5GON platform server
 */



// external modules
const express      = require('express');
const exphbs       = require('express-handlebars');
const bodyParser   = require('body-parser');
const cookieParser = require('cookie-parser');
const session      = require('express-session');

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

let hbs = exphbs.create({
    extname: 'hbs',
    defaultLayout: 'main',
    partialsDir: `${__dirname}/views/partials/`,
    helpers: {
        isEqual: function (arg1, arg2) {
            return arg1 === arg2;
        },
        statusColor: function (arg1) {
            return arg1 === 'online' ? 'text-success' :
                arg1 === 'launching' ? 'text-warning' :
                'text-danger';
        },
        json: function (obj) {
            return JSON.stringify(obj);
        },
        concat: function (...args) {
            args.pop(); return args.join('');
        }
    }
});

hbs.handlebars = require('handlebars-helper-sri').register(hbs.handlebars);

// set rendering engine
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');

// redirect specific requests to other services
require('./routes/proxies')(app, config);

// cookie parser
app.use(cookieParser(config.platform.sessionSecret));

// sets the API routes
require('./routes/route.handler')(app, pg, logger, config /*, monitor */);

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