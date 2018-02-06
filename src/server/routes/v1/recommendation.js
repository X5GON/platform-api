/**
 * Adds API routes for the recommendations.
 * @param {Object} app - Express app.
 * @param {Object} pg - Postgres connection wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (app, pg, logger) {

    // GET recommendations
    app.get('/api/v1/recommendations', (req, res) => {
        // TODO: return the recommended OER
        res.send('ping');
    });

};