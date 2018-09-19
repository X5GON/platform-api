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
        if (Object.keys(req.query).length) {
            // get user query parameters and/or set initial ones
            let queryParams = req.query;
            queryParams.type = queryParams.type || 'all';
            queryParams.page = queryParams.page || 1;

            let queryString = Object.keys(queryParams).map(key => `${key}=${encodeURIComponent(queryParams[key])}`).join('&');
            request(`http://localhost:8080/api/recommend/content?${queryString}`, (error, httpRequest, body) => {
                // set query parameters
                let query = {
                    query: queryParams.text,
                    types: {
                        selectedType: queryParams.type ? queryParams.type : 'all',
                        get active() {
                            let self = this;
                            return function (type) {
                                return self.selectedType === type;
                            };
                        },
                    },
                    page: 1
                };
                // set placeholder for options
                let options = { };

                try {
                    const recommendations = JSON.parse(body);
                    options.empty = recommendations.length === 0 || recommendations.error ? true : false;
                    recommendations.forEach(recommendation => {
                        if (recommendation.description) {
                            // slice the description into a more digestive element
                            let abstract = recommendation.description.split(' ').slice(0, 30).join(' ');
                            if (recommendation.description !== abstract) { recommendation.description = `${abstract} ...`; }
                        }
                        // determine material type
                        recommendation.type = recommendation.videoType ? 'video' :
                            recommendation.audioType ? 'audio' : 'file-alt';
                    });
                    options.recommendations = recommendations;
                } catch(xerror) {
                    options.empty = true;
                }
                return res.render('search-results', { layout: 'search-results', query, options });

            });

            // currently redirect to form page
        } else {
            // currently redirect to form page
            return res.render('search', { layout: 'search' });
        }
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