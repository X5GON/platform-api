// external modules
const router = require('express').Router();
const request = require('request');

/********************************************
 * Helper functions
 *******************************************/

/**
 * Adds API routes for platform website requests.
 * @param {Object} pg - Postgres connection wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (pg, logger) {


    /********************************************
     * PORTAL PAGES
     */

    router.get('/search', (req, res) => {
        // currently redirect to form page
        return res.render('search');
    });

    // send application form page
    router.get('/api/v1/search', (req, res) => {
        const query = req.query;

        let queryString = Object.keys(query).map(key => `${key}=${encodeURIComponent(query[key])}`).join('&');
        request(`http://localhost:8080/api/recommend/content?${queryString}`, (error, httpRequest, body) => {
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