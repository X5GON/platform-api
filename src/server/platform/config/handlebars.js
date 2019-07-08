// import handlebars
const exphbs = require('express-handlebars');

/**
 * Adds handlebars rendering support.
 * @param {Object} app - The express object.
 */
module.exports = function (app) {

    let hbs = exphbs.create({
        extname: 'hbs',
        defaultLayout: 'main',
        partialsDir: `${__dirname}/../views/partials/`,
        helpers: {
            isEqual: function (arg1, arg2) {
                return arg1 === arg2;
            },
            isNotEqual: function (arg1, arg2) {
                return arg1 !== arg2;
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
}