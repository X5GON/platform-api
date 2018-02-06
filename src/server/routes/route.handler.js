/**
 * Adds api routes to express app.
 * @param {Object} app - Express app.
 * @param {Object} pg - Postgres wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (app, pg, logger) {

    ////////////////////////////////////////
    // API Routes
    ////////////////////////////////////////

    require('./v1/recommendation')(app, pg, logger);
    require('./v1/activity-logging')(app, pg, logger);
};