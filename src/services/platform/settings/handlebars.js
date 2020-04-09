// import handlebars
const exphbs = require("express-handlebars");

/**
 * Adds handlebars rendering support.
 * @param {Object} app - The express object.
 */
module.exports = function (app) {
    let hbs = exphbs.create({
        extname: "hbs",
        defaultLayout: "main",
        partialsDir: `${__dirname}/../views/partials/`,
        helpers: {
            isEqual(arg1, arg2) {
                return arg1 === arg2;
            },
            isNotEqual(arg1, arg2) {
                return arg1 !== arg2;
            },
            statusColor(arg1) {
                return arg1 === "online" ? "text-success"
                    : arg1 === "launching" ? "text-warning"
                        : "text-danger";
            },
            json(obj) {
                return JSON.stringify(obj);
            },
            concat(...args) {
                args.pop(); return args.join("");
            }
        }
    });

    hbs.handlebars = require("handlebars-helper-sri").register(hbs.handlebars);

    // set rendering engine
    app.engine("hbs", hbs.engine);
    app.set("view engine", "hbs");
};
