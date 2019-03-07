// external modules
const router = require('express').Router();
const path = require('path');

const env = process.env.NODE_ENV;
// internal modules - recommendation base & models
const x5recommend = new (require(path.join(__dirname, '../engine/x5recommend')))({
    mode: 'readOnly',
    path: path.join(__dirname, '../../../../data/recsys'),
    env
});

/**
 * Adds API routes for the recommendations.
 * @param {Object} pg - Postgres connection wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (pg, logger) {

    // x5gon cookie name
    const x5gonCookieName = 'x5gonTrack';

    /**
     * @description Checks if there are query parameters for GET requests
     */
    router.get((req, res, next) => {
        // get the query parameters
        if (Object.keys(req.query).length === 0) {
            // no query parameters were given
            let errorMessage = 'user did not provide any of the query parameters: text, url';
            logger.warn('warning [query_parameters]: client requested for recommendation failed',
                logger.formatRequest(req, { error: errorMessage })
            );
            // send error response
            return res.status(400).send({ error: "Bad request: " + errorMessage });
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
    router.get('/recommend/materials', (req, res) => {
        logger.info('client requested for recommendation',
            logger.formatRequest(req)
        );

        let query = req.query;
        // get the recommended material
        let recommendations = x5recommend.recommend(query, 'materials');

        recommendations.then(results => {
            // log the recommendation success
            logger.info('client requested for recommendation successful');
            // send the recommendations to the user
            return res.status(200).send(results);
        }).catch(error => {
            if (error) {
                let errorMessage = 'error when making recommendations: ' + error.message;
                logger.warn('warning [query_parameters]: client requested for recommendation failed',
                    logger.formatRequest(req, { error: errorMessage })
                );
            }
            return res.status(400).send({ error: "Bad request: " + error.message });
        });

    });



    // POST recommendation based on query
    router.post('/recommend/materials', (req, res) => {
        logger.info('client requested for recommendation',
            logger.formatRequest(req)
        );

        // get the query parameters
        let query = req.body;
        // get the recommended material
        let recommendations = x5recommend.recommend(query, 'materials');

        recommendations.then(results => {
            // log the recommendation success
            logger.info('client requested for recommendation successful');
            // send the recommendations to the user
            return res.status(200).send(results);
        }).catch(error => {
            if (error.error) {
                let errorMessage = 'error when making recommendations: ' + error.error;
                logger.warn('warning [query_parameters]: client requested for recommendation failed',
                    logger.formatRequest(req, { error: errorMessage })
                );
            }
            return res.status(400).send({ error: "Bad request: " + error.error });
        });

    });



    // GET recommendation based on query
    router.get('/recommend/bundles', (req, res) => {
        logger.info('client requested for recommendation',
            logger.formatRequest(req)
        );

        let query = req.query;
        // get the recommended material
        let recommendations = x5recommend.recommend(query, 'bundle');

        recommendations.then(results => {
            // log the recommendation success
            logger.info('client requested for recommendation successful');
            // send the recommendations to the user
            return res.status(200).send(results);
        }).catch(error => {
            if (error.error) {
                let errorMessage = 'error when making recommendations: ' + error.error;
                logger.warn('warning [query_parameters]: client requested for recommendation failed',
                    logger.formatRequest(req, { error: errorMessage })
                );
            }
            return res.status(400).send({ error: "Bad request: " + error.error });
        });


    });



    // POST recommendation based on query
    router.post('/recommend/bundles', (req, res) => {
        logger.info('client requested for recommendation',
            logger.formatRequest(req)
        );

        // get the query parameters
        let query = req.body;

        // get the recommended material
        let recommendations = x5recommend.recommend(query, 'bundle');

        recommendations.then(results => {
            // log the recommendation success
            logger.info('client requested for recommendation successful');
            // send the recommendations to the user
            return res.status(200).send(results);
        }).catch(error => {
            if (error.error) {
                let errorMessage = 'error when making recommendations: ' + error.error;
                logger.warn('warning [query_parameters]: client requested for recommendation failed',
                    logger.formatRequest(req, { error: errorMessage })
                );
            }
            return res.status(400).send({ error: "Bad request: " + error.error });
        });

    });




    // GET recommendation based on query
    router.get('/recommend/personalized', (req, res) => {
        logger.info('client requested for personalized recommendation',
            logger.formatRequest(req)
        );

        // get the query parameters
        let query = req.query;
        query.uuid = req.cookies[x5gonCookieName] ? req.cookies[x5gonCookieName] : null;

        // get the recommended material
        let recommendations = x5recommend.recommend(query, 'personal');

        recommendations.then(function(result) {
            if (result.error){
                let errorMessage = 'error when making personalized recommendations: ' + result.error;
                logger.warn('warning [query_parameters]: client requested for recommendation failed',
                    logger.formatRequest(req, { error: errorMessage })
                );
                logger.warn('trying content-based recommendations');
                //trying content-based recommendations
                let contentRecommendations = x5recommend.recommend(query);
                contentRecommendations.then(function (content) {
                    if (contentRecommendations.error){
                        let errorMessage = 'error when making recommendations: ' + recommendations.error;
                        logger.warn('warning [query_parameters]: client requested for recommendation failed',
                            logger.formatRequest(req, { error: errorMessage })
                        );
                        return res.status(400).send({ error: "Bad request: " + contentRecommendations.error });
                    }
                    // log the recommendation success
                    logger.info('client requested for recommendation successful');
                    // send the recommendations to the user
                    return res.status(200).send(contentRecommendations);
                });

            }

            // log the recommendation success
            logger.info('client requested for recommendation successful');
            // send the recommendations to the user
            return res.status(200).send(result);

        }).catch(function(err){
                let errorMessage = 'error when making recommendations: ' + err.error;
                logger.warn('warning [query_parameters]: client requested for recommendation failed',
                    logger.formatRequest(req, { error: errorMessage })
                );
                return res.status(400).send({ error: "Bad request: " + err.error });
            });
    });

    return router;
};