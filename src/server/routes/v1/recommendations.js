// external modules
const router = require('express').Router();
const path = require('path');

// internal modules - recommendation base & models
const x5recommend = new (require(path.join(__dirname, '../../../lib/x5recommend')))({
    mode: 'readOnly',
    path: path.join(__dirname, '../../../../data/x5recommend')
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
            return res.send({ error: errorMessage });
        }

        // get the recommended material
        let recommendations = x5recommend.recommendContent(query);

        // log the recommendation success
        logger.info('client requested for recommendation successful');
        // send the recommendations to the user
        return res.send(recommendations);

    });

    return router;
};