// create proxy for api calls
const proxy = require('http-proxy-middleware');

/**
 * @description Adds proxies to express app.
 * @param {Object} app - Express app.
 */
module.exports = function (app, config) {

    /**********************************
     * Recommender Engine Proxy
     *********************************/

    // redirect to the Recommendation System route
    app.use('/api/v1/recommend', proxy('/api/v1/recommend', {
        target: `http://127.0.0.1:${config.recsys.port}`
    }));

};