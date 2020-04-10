// external modules
const router = require("express").Router();
const path = require("path");

const env = process.env.NODE_ENV;
// internal modules - recommendation base & models
const x5recommend = new (require(path.join(__dirname, "../engine/x5recommend")))({
    mode: "readOnly",
    path: path.join(__dirname, "../../data/recsys"),
    env
});

/**
 * Adds API routes for the recommendations.
 * @param {Object} pg - Postgres connection wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (pg, logger, config) {
    // x5gon cookie name
    const x5gonCookieName = config.platform.cookieID;

    /**
     * @description Checks if there are query parameters for GET requests
     */
    router.get((req, res, next) => {
        // get the query parameters
        if (Object.keys(req.query).length === 0) {
            // no query parameters were given
            let errorMessage = "user did not provide any of the query parameters: text, url";
            // error when making material request
            logger.warn("[warn] missing parameters, text or url",
                logger.formatRequest(req, {
                    error: {
                        message: errorMessage,
                    }
                }));
            // send error response
            return res.status(400).send({ error: `Bad request: ${errorMessage}` });
        }
        // continue with next component
        return next();
    });


    /**
     * Prepare query parameters for a given GET request
     */
    router.get((req, res, next) => {
        if (req.query.url) {
            // decode the url in the provided query
            req.query.url = decodeURIComponent(req.query.url);
        }
        // continue with next component
        return next();
    });


    /**
     * Prepare request body for given POST request
     */
    router.post((req, res, next) => {
        if (req.body.url) {
            // decode the url in the provided query
            req.body.url = decodeURIComponent(req.body.url);
        }
        // continue with next component
        return next();
    });


    // GET recommendation based on query
    router.get("/recommend/materials", (req, res) => {
        let query = req.query;
        // get the recommended material
        let recommendations = x5recommend.recommend(query, "materials");

        recommendations.then((results) =>
            // send the recommendations to the user
            res.status(200).send(results)).catch((error) => {
            // error when making material request
            logger.error("[error] recommendation material",
                logger.formatRequest(req, {
                    error: {
                        message: error.message,
                        stack: error.stack,
                    }
                }));
            // returning the results
            return res.status(400).send({ error: `Bad request: ${error.message}` });
        });
    });


    // POST recommendation based on query
    router.post("/recommend/materials", (req, res) => {
        // get the query parameters
        let query = req.body;
        // get the recommended material
        let recommendations = x5recommend.recommend(query, "materials");

        recommendations.then((results) =>
            // send the recommendations to the user
            res.status(200).send(results)).catch((error) => {
            // error when making material results
            logger.error("[error] recommendation material",
                logger.formatRequest(req, {
                    error: {
                        message: error.error
                    }
                }));
            // returning the results
            return res.status(400).send({ error: `Bad request: ${error.error}` });
        });
    });


    // GET recommendation based on query
    router.get("/recommend/bundles", (req, res) => {
        // get the query parameters
        let query = req.query;
        // get the recommended material
        let recommendations = x5recommend.recommend(query, "bundle");

        recommendations.then((results) =>
            // send the recommendations to the user
            res.status(200).send(results)).catch((error) => {
            // error when making material bundles results
            logger.error("[error] recommendation bundles",
                logger.formatRequest(req, {
                    error: {
                        message: error.error
                    }
                }));
            // returning the results
            return res.status(400).send({ error: `Bad request: ${error.error}` });
        });
    });


    // POST recommendation based on query
    router.post("/recommend/bundles", (req, res) => {
        // get the query parameters
        let query = req.body;
        // get the recommended material
        let recommendations = x5recommend.recommend(query, "bundle");

        recommendations.then((results) =>
            // send the recommendations to the user
            res.status(200).send(results)).catch((error) => {
            // error when making material bundles results
            logger.error("[error] recommendation bundles",
                logger.formatRequest(req, {
                    error: {
                        message: error.error
                    }
                }));
            // returning the results
            return res.status(400).send({ error: `Bad request: ${error.error}` });
        });
    });

    // GET recommendation based on query
    router.get("/recommend/personalized", (req, res) => {
        // get the query parameters
        let query = req.query;
        query.uuid = req.cookies[x5gonCookieName] ? req.cookies[x5gonCookieName] : null;

        // get the recommended material
        let recommendations = x5recommend.recommend(query, "personal");

        recommendations.then((results) => {
            if (results.error) {
                // error when making material personalization results
                logger.warn("[warn] recommendation personalization",
                    logger.formatRequest(req, {
                        error: {
                            message: results.error
                        }
                    }));
                logger.warn("[warn] trying content-based recommendations");
                // trying content-based recommendations
                let contentRecommendations = x5recommend.recommend(query);
                contentRecommendations.then((content) => {
                    if (content.error) {
                        // error when making material content results
                        logger.warn("[warn] recommendation content",
                            logger.formatRequest(req, {
                                error: {
                                    message: content.error
                                }
                            }));
                        // send the error message to the user
                        return res.status(400).send({ error: `Bad request: ${content.error}` });
                    }
                    // send the recommendations to the user
                    return res.status(200).send(content);
                });
            }

            // send the recommendations to the user
            return res.status(200).send(results);
        }).catch((error) => {
            // error when making material personalization results
            logger.warn("[warn] recommendation personalization/content",
                logger.formatRequest(req, {
                    error: {
                        message: error.error
                    }
                }));
            // send the error message to the user
            return res.status(400).send({ error: `Bad request: ${error.error}` });
        });
    });

    // GET recommendation based on history
    router.get("/recommend/collaborativeFiltering", (req, res) => {
        // get the query parameters
        let query = req.query;
        query.uuid = req.cookies[x5gonCookieName] ? req.cookies[x5gonCookieName] : null;

        if (Object.keys(query).length === 0) {
            // no query parameters were given
            let errorMessage = "user did not provide any of the query parameters: text, url";
            logger.warn("warning [query_parameters]: client requested for recommendation failed",
                logger.formatRequest(req, { error: errorMessage }));
            // send error response
            return res.status(400).send({ error: `Bad request: ${errorMessage}` });
        }

        // get the recommended material - returns a promise
        let recommendations = x5recommend.recommend(query, "collaborative");

        recommendations.then((result) => {
            if (result.error) {
                let errorMessage = `error when making CF recommendations: ${result.error}`;
                logger.warn("warning [query_parameters]: client requested for CF recommendation failed",
                    logger.formatRequest(req, { error: errorMessage }));
                logger.warn("trying content-based recommendations");
                // trying content-based recommendations
                let contentRecommendations = x5recommend.recommend(query);
                if (contentRecommendations.error) {
                    let errorMessage = `error when making recommendations: ${recommendations.error}`;
                    logger.warn("warning [query_parameters]: client requested for recommendation failed",
                        logger.formatRequest(req, { error: errorMessage }));
                    return res.status(400).send({ error: `Bad request: ${contentRecommendations.error}` });
                }
                // send the recommendations to the user
                return res.status(200).send(contentRecommendations);
            }

            // send the recommendations to the user
            return res.status(200).send(result);
        }).catch((err) => {
            let errorMessage = `error when making CF recommendations: ${err}`;
            logger.warn("warning [query_parameters]: client requested for recommendation failed",
                logger.formatRequest(req, { error: errorMessage }));
            return res.status(400).send({ error: `Bad request: ${err.message}` });
        });
    });

    return router;
};
