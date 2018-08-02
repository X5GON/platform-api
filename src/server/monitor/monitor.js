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
const PM2Monitor = require('../../lib/pm2-monitor');
let monitor = new PM2Monitor();

// parameters given to the process
const argv = require('minimist')(process.argv.slice(2));

// create express app
let app = express();
let http = require('http').Server(app);
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

// configure handlebars engine
const hbs = exphbs.create({
    defaultLayout: 'main',
    extname: 'hbs',
    helpers: {
        isEqual: function (arg1, arg2) { return arg1 === arg2; },
        statusColor: function (arg1) {
            return arg1 === 'online' ? 'text-success' :
                arg1 === 'launching' ? 'text-warning' :
                'text-danger';
        }
    }
});

// set rendering engine
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');

// cookie parser
app.use(cookieParser(argv['session-secret']));

// sets the API routes
app.use('/', require('./routes/website')(monitor)); // website request handling

// parameters used on the express app
const PORT = argv.PORT || 7500;


// configure socket connections
io.on('connection', function(socket){
    console.log('a user connected');
    socket.on('disconnect', function () {
        console.log('user disconnected');
    });

    setInterval(() => {
        monitor.listProcesses((error, list) => {
            return error ?
                io.emit('pm2-process-error', { error }) :
                io.emit('pm2-process', list);
        });
    }, 500);


});

// start the server
http.listen(PORT, () => console.log(`platform monitor running on PORT:${PORT}`));