// create proxy for api calls
const express = require("express");
const proxy = require("http-proxy-middleware");
const cors = require("cors");

const router = express.Router();

/**
 * @description Adds proxies to express app.
 * @param {Object} app - Express app.
 */
module.exports = function (logger, config) {
    // //////////////////////////////////////
    // Recommender Engine Proxy
    // //////////////////////////////////////

    // redirect to the Recommendation System route
    router.use("/api/v2/search", cors(), proxy({
        target: `http://127.0.0.1:${config.search.port}`,
        pathRewrite: {
            "^/api/v2/search": "/api/v1/oer_materials",
        },
        logProvider() {
            // create logger for sending requests
            return logger;
        }
    }));

    return router;
};
