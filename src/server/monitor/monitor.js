/************************************************
 * Runs the X5GON platform monitor. It will
 * collect information about processes and
 * send email notifications when a process
 * starts to crash.
 */

// external modules
const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');

// internal modules
const pg = require('../../lib/postgresQL')(require('../../config/pgconfig'));

// parameters given to the process
const argv = require('minimist')(process.argv.slice(2));

// create express app
let app = express();
let http = require('http')(app);
// initialize socket
let io = require('socket.io')(http);

// configure application
app.use(bodyParser.json());     // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));

app.use(session({
    secret: argv['session-secret'],
    resave: true,
    saveUninitialized: true,
    cookie: { domain: '.x5gon.org' }
}));

// add the public folder
app.use(express.static(__dirname + '/public/'));

// set rendering engine
app.engine('hbs', exphbs({
    defaultLayout: 'main',
    extname: 'hbs'
}));
app.set('view engine', 'hbs');

// cookie parser
app.use(cookieParser(argv['session-secret']));

// sets the API routes
require('./routes/route.handler')(app, pg, logger);

// parameters used on the express app
const PORT = argv.PORT || 7500;

// configure socket connections
io.on('connection', function(socket){
    console.log('a user connected');
});

// start the server
http.listen(PORT, () => logger.info(`platform monitor running on PORT:${PORT}`));