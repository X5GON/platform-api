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
    
    // user activity data handling
    app.use('/api/v1', require('./v1/activity-logging')(pg, logger)); 
};