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
    app.use('/api/recommend', proxy('/api/recommend', {
        target: 'http://localhost:3000',
        pathRewrite: { '^/api/recommend/': '/api/v1/recommend/' }
    }));

};