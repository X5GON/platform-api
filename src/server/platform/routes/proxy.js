// configurations
const config = require('../../../config/config');

// create proxy for api calls
const proxy = require('http-proxy-middleware');

/**
 * Adds proxies to express app.
 * @param {Object} app - Express app.
 * @param {Object} pg - Postgres wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (app) {
    // redirect to the Recommendation System route
    app.use('/api/v1/recommend', proxy('/api/v1/recommend', {
        target: `http://localhost:${config.recsys.port}`,
        // pathRewrite: { '^/api/v1/recommend/': '/api/v1/recommend/' }
    }));

};