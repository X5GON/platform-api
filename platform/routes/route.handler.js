/**
 * @description Adds API routes to express app.
 * @param {Object} app - Express app.
 * @param {Object} pg - Postgres wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (app, pg, logger, config, passport, monitor) {
    // //////////////////////////////////////
    // Version 2 API
    // //////////////////////////////////////

    app.use(require("./v2/oer_materials")(pg, logger, config));
    app.use(require("./v2/oer_contents")(pg, logger));
    app.use(require("./v2/oer_providers")(pg));
    app.use(require("./v2/wikipedia")(pg, logger));

    app.use(require("./v2/search")(logger, config));
    app.use(require("./v2/embed")(logger, config));
    app.use(require("./v2/upload")(pg, logger, config));

    // //////////////////////////////////////
    // Version 1 API
    // //////////////////////////////////////

    // service REST API
    app.use(require("./v1/connect")(logger, config));
    app.use(require("./v1/transitions")(logger, config));
    app.use(require("./v1/search")(pg, logger, config));
    app.use(require("./v1/upload")(pg, logger, config));
    app.use(require("./v1/oer_materials")(pg, logger, config));

    // //////////////////////////////////////
    // Website routes
    // //////////////////////////////////////

    app.use("/", require("./v1/admin")(pg, logger, config, passport, monitor));
    app.use("/", require("./v1/website")(pg, logger, config));
};
