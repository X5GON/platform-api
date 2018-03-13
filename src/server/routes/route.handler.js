/**
 * Adds API routes to express app.
 * @param {Object} app - Express app.
 * @param {Object} pg - Postgres wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (app, pg, logger) {

    ////////////////////////////////////////
    // API Routes
    ////////////////////////////////////////
    
    app.use('/api/v1', require('./v1/activity-logging')(pg, logger));
    app.use('/api/v1', require('./v1/recommendations')(pg, logger));
};