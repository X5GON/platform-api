// external modules
const router = require('express').Router();
const request = require('request');

/********************************************
 * Helper functions
 *******************************************/

/**
 * @description Adds API routes for platform website requests.
 * @param {Object} pg - Postgres connection wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (pg, logger, config) {


    ////////////////////////////////////////
    // Helper functions
    ////////////////////////////////////////

    // TODO: write helper functions


    ////////////////////////////////////////
    // API for Material Search
    ////////////////////////////////////////

    // /**
    //  * @api {GET} /api/v1/search Recommendations in JSON
    //  * @apiDescription Gets the recommendations in JSON format
    //  * @apiName GetRecommendationsMeta
    //  * @apiGroup Recommendations
    //  * @apiVersion 1.0.0
    //  *
    //  * @apiParam {String} [text] - The raw text. If both `text` and `url` are present, `url` has the priority.
    //  * @apiParam {String} [url] - The url of the material. If both `text` and `url` are present, `url`
    //  * has the priority.
    //  * @apiParam {String="cosine","null"} [type] - The metrics used in combination with the url parameter.
    //  *
    //  * @apiSuccess (200) {Object} result - The object containing the status and recommendations.
    //  * @apiSuccess (200) {Boolean} result.empty - If recommendations were found for the given query.
    //  * @apiSuccess (200) {Object[]} result.recommendations - The recommendations sorted by relevance/weight in descending order.
    //  * @apiSuccess (200) {Number} result.recommendations.weight - The relevance weight. Bigger weight means bigger relevance.
    //  * @apiSuccess (200) {String} result.recommendations.url - the material url.
    //  * @apiSuccess (200) {String} result.recommendations.title - The material title.
    //  * @apiSuccess (200) {String} result.recommendations.description - The material description.
    //  * @apiSuccess (200) {String} result.recommendations.provider - The provider of the material.
    //  * @apiSuccess (200) {String} result.recommendations.language - The language in which the material is written/spoken.
    //  * @apiSuccess (200) {String="video","audio","text"} result.recommendations.type - The material type.
    //  *
    //  * @apiExample  Example usage:
    //  *      https://platform.x5gon.org/api/v1/search?url=https://platform.x5gon.org/materialUrl&text=deep+learning
    //  */
    // router.get('/search', (req, res) => {

    //     const query = req.query;
    //     let queryString = Object.keys(query).map(key => `${key}=${encodeURIComponent(query[key])}`).join('&');

    //     request(`http://localhost:${config.platform.port}/api/v1/recommend/materials?${queryString}`, (error, httpRequest, body) => {

    //         let options = { empty: true };


    //         if (error) {
    //             // error when making material request
    //             logger.error('[error] request for materials',
    //                 logger.formatRequest(req, {
    //                     error: {
    //                         message: error.message,
    //                         stack: error.stack
    //                     }
    //                 })
    //             );
    //             return res.status(400).send(options);
    //         }

    //         try {
    //             const recommendations = JSON.parse(body);
    //             options.empty = recommendations.length === 0 || recommendations.error ? true : false;
    //             options.recommendations = recommendations;
    //             return res.status(200).send(options);
    //         } catch (xerror) {
    //              // error when processing materials
    //              logger.error('[error] processing materials',
    //                 logger.formatRequest(req, {
    //                     error: {
    //                         message: xerror.message,
    //                         stack: xerror.stack
    //                     }
    //                 })
    //             );
    //             return res.status(400).send(options);
    //         }
    //     });
    // });

     ////////////////////////////////////////
    // Material Search
    ////////////////////////////////////////

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
    router.get('/search', (req, res) => {

        if (!Object.keys(req.query).length) {
            return res.send({
                error: {
                    message: 'No query parameters provided'
                }
            });

        }

        // get user query parameters and/or set initial ones
        let queryParams = req.query;
        queryParams.type = queryParams.type || 'all';
        queryParams.page = parseInt(queryParams.page) || 1;
        queryParams.count = parseInt(queryParams.count) || 10000;

        let queryString = Object.keys(queryParams).map(key => `${key}=${encodeURIComponent(queryParams[key])}`).join('&');
        request(`http://localhost:${config.platform.port}/api/v1/recommend/materials?${queryString}`, (error, httpRequest, body) => {

            // set query parameters
            let query = {
                text: queryParams.text,
                type: queryParams.type ? queryParams.type : 'all',
                page: queryParams.page
            };
            // set placeholder for options
            let options = { query };

            if (error) {
                // error when making search request
                logger.error('making search request',
                    logger.formatRequest(req, {
                        error: {
                            message: error.message,
                            stack: error.stack
                        }
                    })
                );
                options.error = {
                    message: 'Error when retrieving recommendations'
                };

            } else {
                try {
                    const recommendations = JSON.parse(body);

                    // save recommendations
                    let recLength = recommendations.length;
                    options.rec_materials = recommendations.slice(MAX_DOCS * (query.page - 1), MAX_DOCS * query.page);
                    options.metadata = {
                        num_or_materials: recLength,
                        max_pages: Math.ceil(recLength / MAX_DOCS)
                    };


                } catch (xerror) {
                    logger.error('search request processing',
                        logger.formatRequest(req, {
                            error: {
                                message: xerror.message,
                                stack: xerror.stack
                            }
                        })
                    );
                    options.error = {
                        message: 'Error when processing recommendations'
                    };
                }
            }
            // create to search results
            return res.send(options);

        });


    });


    ////////////////////////////////////////
    // End of Router
    ////////////////////////////////////////

    return router;
};