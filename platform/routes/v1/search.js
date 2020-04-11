// external modules
const router = require("express").Router();
const request = require("request").defaults({ jar: true });
const cors = require("cors");
/** ******************************************
 * Helper functions
 ****************************************** */

/**
 * @description Adds API routes for platform website requests.
 * @param {Object} pg - Postgres connection wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (pg, logger, config) {
    // //////////////////////////////////////
    // Helper functions
    // //////////////////////////////////////

    // TODO: write helper functions

    // x5gon cookie name
    const x5gonCookieName = config.platform.cookieID;

    // //////////////////////////////////////
    // Material Search
    // //////////////////////////////////////

    // maximum numbers of documents in recommendation list
    const MAX_DOCS = 10;

    /**
     * @api {GET} /api/v1/search Recommendations in JSON
     * @apiDescription Gets the recommendations in JSON format
     * @apiName GetRecommendationsMeta
     * @apiGroup Recommendations
     * @apiVersion 1.0.0
     *
     * @apiParam {String} [text] - The raw text. If both `text` and `url` are present, `url` has the priority.
     * @apiParam {String} [url] - The url of the material. If both `text` and `url` are present, `url`
     * has the priority.
     * @apiParam {String="cosine","null"} [type] - The metrics used in combination with the url parameter.
     *
     * @apiSuccess (200) {Object} result - The object containing the status and recommendations.
     * @apiSuccess (200) {Boolean} result.empty - If recommendations were found for the given query.
     * @apiSuccess (200) {Object[]} result.recommendations - The recommendations sorted by relevance/weight in descending order.
     * @apiSuccess (200) {Number} result.recommendations.weight - The relevance weight. Bigger weight means bigger relevance.
     * @apiSuccess (200) {String} result.recommendations.url - the material url.
     * @apiSuccess (200) {String} result.recommendations.title - The material title.
     * @apiSuccess (200) {String} result.recommendations.description - The material description.
     * @apiSuccess (200) {String} result.recommendations.provider - The provider of the material.
     * @apiSuccess (200) {String} result.recommendations.language - The language in which the material is written/spoken.
     * @apiSuccess (200) {String="video","audio","text"} result.recommendations.type - The material type.
     *
     * @apiExample  Example usage:
     *      https://platform.x5gon.org/api/v1/search?url=https://platform.x5gon.org/materialUrl&text=deep+learning
     */
    router.get("/api/v1/recommend/oer_materials", cors(), (req, res) => {
        if (!Object.keys(req.query).length) {
            return res.send({
                error: {
                    message: "No query parameters provided"
                }
            });
        }

        // get user query parameters and/or set initial ones
        let queryParams = req.query;
        queryParams.page = parseInt(queryParams.page) || 1;
        queryParams.count = parseInt(queryParams.count) || 10000;

        let queryString = Object.keys(queryParams).map((key) => `${key}=${encodeURIComponent(queryParams[key])}`).join("&");
        request(`http://localhost:${config.recsys.port}/api/v1/recommend/materials?${queryString}`, (error, httpRequest, body) => {
            // set query parameters
            let query = {
                ...queryParams.url && { url: queryParams.url },
                page: queryParams.page
            };
            // set placeholder for options
            let options = { query };

            if (error) {
                // error when making search request
                logger.error("making search request",
                    logger.formatRequest(req, {
                        error: {
                            message: error.message,
                            stack: error.stack
                        }
                    }));
                options.error = {
                    message: "Error when retrieving bundle recommendations"
                };
            } else {
                try {
                    const recommendations = JSON.parse(body);

                    // save recommendations
                    let recLength = recommendations.length;
                    options.rec_materials = recommendations.slice(MAX_DOCS * (query.page - 1), MAX_DOCS * query.page);
                    options.metadata = {
                        count: recLength,
                        max_pages: Math.ceil(recLength / MAX_DOCS)
                    };
                } catch (xerror) {
                    logger.error("search request processing",
                        logger.formatRequest(req, {
                            error: {
                                message: xerror.message,
                                stack: xerror.stack
                            }
                        }));
                    options.error = {
                        message: "Error when processing bundle recommendations"
                    };
                }
            }
            // create to search results
            return res.send(options);
        });
    });

    router.get("/api/v1/recommend/oer_bundles", cors(), (req, res) => {
        if (!Object.keys(req.query).length) {
            return res.send({
                error: {
                    message: "No query parameters provided"
                }
            });
        }

        // get user query parameters and/or set initial ones
        let queryParams = req.query;
        queryParams.page = parseInt(queryParams.page) || 1;
        queryParams.count = parseInt(queryParams.count) || 10000;

        let queryString = Object.keys(queryParams).map((key) => `${key}=${encodeURIComponent(queryParams[key])}`).join("&");
        request(`http://localhost:${config.recsys.port}/api/v1/recommend/bundles?${queryString}`, (error, httpRequest, body) => {
            // set query parameters
            let query = {
                ...queryParams.url && { url: queryParams.url },
                page: queryParams.page
            };
            // set placeholder for options
            let options = { query };

            if (error) {
                // error when making search request
                logger.error("making search request",
                    logger.formatRequest(req, {
                        error: {
                            message: error.message,
                            stack: error.stack
                        }
                    }));
                options.error = {
                    message: "Error when retrieving bundle recommendations"
                };
            } else {
                try {
                    const recommendations = JSON.parse(body);

                    // save recommendations
                    let recLength = recommendations.length;
                    options.rec_bundles = recommendations.slice(MAX_DOCS * (query.page - 1), MAX_DOCS * query.page);
                    options.metadata = {
                        count: recLength,
                        max_pages: Math.ceil(recLength / MAX_DOCS)
                    };
                } catch (xerror) {
                    logger.error("search request processing",
                        logger.formatRequest(req, {
                            error: {
                                message: xerror.message,
                                stack: xerror.stack
                            }
                        }));
                    options.error = {
                        message: "Error when processing bundle recommendations"
                    };
                }
            }
            // create to search results
            return res.send(options);
        });
    });


    router.get("/api/v1/recommend/personalized", cors(), (req, res) => {
        const j = request.jar();
        const cookie = request.cookie(`x5gonTrack=${req.cookies[x5gonCookieName]}`);
        const url = `http://localhost:${config.recsys.port}/api/v1/recommend/personalized`;
        // assign the cookie to the url
        j.setCookie(cookie, url);

        // get user query parameters and/or set initial ones
        let queryParams = req.query;
        queryParams.page = parseInt(queryParams.page) || 1;

        request({ url, jar: j }, (error, httpRequest, body) => {
            // set query parameters
            let query = {
                page: queryParams.page
            };

            // set placeholder for options
            let options = {
                query
            };

            if (error) {
                // error when making search request
                logger.error("making search request",
                    logger.formatRequest(req, {
                        error: {
                            message: error.message,
                            stack: error.stack
                        }
                    }));
                options.error = {
                    message: "Error when retrieving recommendations"
                };
            } else {
                try {
                    const recommendations = JSON.parse(body);

                    // save recommendations
                    let recLength = recommendations.length;
                    options.rec_bundles = recommendations.slice(MAX_DOCS * (query.page - 1), MAX_DOCS * query.page);
                    options.metadata = {
                        count: recLength,
                        max_pages: Math.ceil(recLength / MAX_DOCS)
                    };
                } catch (xerror) {
                    logger.error("search request processing",
                        logger.formatRequest(req, {
                            error: {
                                message: xerror.message,
                                stack: xerror.stack
                            }
                        }));
                    options.error = {
                        message: "Error when processing bundle recommendations"
                    };
                }
            }
            // create to search results
            return res.send(options);
        });
    });


    router.get("/api/v1/recommend/collaborative_filtering", cors(), (req, res) => {
        const j = request.jar();
        const cookie = request.cookie(`x5gonTrack=${req.cookies[x5gonCookieName]}`);
        const url = `http://localhost:${config.recsys.port}/api/v1/recommend/collaborativeFiltering`;
        // assign the cookie to the url
        j.setCookie(cookie, url);

        // get user query parameters and/or set initial ones
        let queryParams = req.query;
        queryParams.page = parseInt(queryParams.page) || 1;

        request({ url, jar: j }, (error, httpRequest, body) => {
            // set query parameters
            let query = {
                page: queryParams.page
            };

            // set placeholder for options
            let options = {
                query
            };

            if (error) {
                // error when making search request
                logger.error("making search request",
                    logger.formatRequest(req, {
                        error: {
                            message: error.message,
                            stack: error.stack
                        }
                    }));
                options.error = {
                    message: "Error when retrieving recommendations"
                };
            } else {
                try {
                    const recommendations = JSON.parse(body);

                    // save recommendations
                    let recLength = recommendations.length;
                    options.rec_bundles = recommendations.slice(MAX_DOCS * (query.page - 1), MAX_DOCS * query.page);
                    options.metadata = {
                        count: recLength,
                        max_pages: Math.ceil(recLength / MAX_DOCS)
                    };
                } catch (xerror) {
                    logger.error("search request processing",
                        logger.formatRequest(req, {
                            error: {
                                message: xerror.message,
                                stack: xerror.stack
                            }
                        }));
                    options.error = {
                        message: "Error when processing bundle recommendations"
                    };
                }
            }
            // create to search results
            return res.send(options);
        });
    });


    // //////////////////////////////////////
    // End of Router
    // //////////////////////////////////////

    return router;
};
