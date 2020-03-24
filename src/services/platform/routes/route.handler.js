/**
 * @description Adds API routes to express app.
 * @param {Object} app - Express app.
 * @param {Object} pg - Postgres wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (app, pg, logger, config, passport, monitor) {
    // //////////////////////////////////////
    // API Routes
    // //////////////////////////////////////

    // service REST API
    app.use(require("./v1/connect")(logger, config));
    app.use(require("./v1/transitions")(logger, config));

    // search REST API
    app.use(require("./v1/search")(pg, logger, config));

    // upload REST API
    app.use(require("./v1/upload")(pg, logger, config));

    // query REST API
    app.use(require("./v1/oer_materials")(pg, logger, config));


    // //////////////////////////////////////
    // Website routes
    // //////////////////////////////////////

    app.use("/", require("./v1/admin")(pg, logger, config, passport, monitor));
    app.use("/", require("./v1/website")(pg, logger, config));
};
