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

    // GET recommendation based on query
    router.get('/recommend/content', (req, res) => {
        logger.info('client requested for recommendation',
            logger.formatRequest(req)
        );

        // get the query parameters
        let query = req.query;

        if (Object.keys(query).length === 0) {
            // no query parameters were given
            let errorMessage = 'user did not provide any of the query parameters: text, url';
            logger.warn('warning [query_parameters]: client requested for recommendation failed',
                logger.formatRequest(req, { error: errorMessage })
            );
            // send error response
            res.status(400);
            return res.send({ error: "Bad request: " + errorMessage });
        }

        // get the recommended material
        let recommendations = x5recommend.recommend(query);

        if (recommendations.error){
            let errorMessage = 'error when making recommendations: ' + recommendations.error;
            logger.warn('warning [query_parameters]: client requested for recommendation failed',
                logger.formatRequest(req, { error: errorMessage })
            );
            res.status(400);
            return res.send({ error: "Bad request: " + recommendations.error });
        }

        // log the recommendation success
        logger.info('client requested for recommendation successful');
        // send the recommendations to the user
        res.status(200);
        return res.send(recommendations);

    });

    // POST recommendation based on query
    router.post('/recommend/content', (req, res) => {
        logger.info('client requested for recommendation',
            logger.formatRequest(req)
        );

        // get the query parameters
        let query = req.body;

        if (Object.keys(query).length === 0) {
            // no query parameters were given
            let errorMessage = 'user did not provide any of the query parameters: text, url';
            logger.warn('warning [query_parameters]: client requested for recommendation failed',
                logger.formatRequest(req, { error: errorMessage })
            );
            // send error response
            res.status(400);
            return res.send({ error: "Bad request: " + errorMessage });
        }

        // get the recommended material
        let recommendations = x5recommend.recommend(query);

        if (recommendations.error){
            let errorMessage = 'error when making recommendations: ' + recommendations.error;
            logger.warn('warning [query_parameters]: client requested for recommendation failed',
                logger.formatRequest(req, { error: errorMessage })
            );
            res.status(400);
            return res.send({ error: "Bad request: " + recommendations.error });
        }

        // log the recommendation success
        logger.info('client requested for recommendation successful');
        // send the recommendations to the user
        res.status(200);
        return res.send(recommendations);

    });

    return router;
};