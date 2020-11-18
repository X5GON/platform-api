// create proxy for api calls
const proxy = require("http-proxy-middleware");
const cors = require("cors");

// logger for proxying requests
const Logger = require("../library/logger");

/**
 * @description Adds proxies to express app.
 * @param {Object} app - Express app.
 */
module.exports = function (app, config) {
    // //////////////////////////////////////
    // Recommender Engine Proxy
    // //////////////////////////////////////

    // redirect to the Recommendation System route
    app.use([
        "/api/v1/search",
    ], cors(), proxy({
        target: `http://127.0.0.1:${config.search.port}`,
        pathRewrite: {
            "^/api/v1/search": "/api/v1/oer_materials",
        },
        logProvider(provider) {
            // create logger for sending requests
            return Logger.createInstance("proxy", "info", "platform", config.isProduction);
        }
    }));

    // // redirect to the Recommendation System route
    // app.use('/api/v1/qa', proxy('/api/v1/qa', {
    //     target: `http://127.0.0.1:${config.quality.port}`,
    //     pathRewrite: {
    //         '^/api/v1/qa': '/api/v1/qa'
    //     },
    //     logProvider: function (provider) {
    //         // create logger for sending requests
    //         return Logger.createInstance(`proxy`, 'info', 'platform', config.isProduction);
    //     }
    // }));
};
