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

    /********************************************
     * Helper functions
     *******************************************/

    // TODO: write helper functions

    /**********************************
     * Routes
     *********************************/

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
        const query = req.query;
        let queryString = Object.keys(query).map(key => `${key}=${encodeURIComponent(query[key])}`).join('&');
        request(`http://localhost:${config.platform.port}/api/v1/recommend/materials?${queryString}`, (error, httpRequest, body) => {
            let options = { };
            try {
                const recommendations = JSON.parse(body);
                options.empty = recommendations.length === 0 || recommendations.error ? true : false;
                options.recommendations = recommendations;
                return res.status(200).send(options);
            } catch(xerror) {
                options.empty = true;
                return res.status(400).send(options);
            }
        });
    });


    return router;
};