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

    // maximum numbers of documents in recommendation list
    const MAX_DOCS = 10;

    /********************************************
     * PORTAL PAGES
     */

    router.get('/search', (req, res) => {
        if (Object.keys(req.query).length) {
            // get user query parameters and/or set initial ones
            let queryParams = req.query;
            queryParams.type = queryParams.type || 'all';
            queryParams.page = parseInt(queryParams.page) || 1;

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
                    page: queryParams.page
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
                        // embed url
                        recommendation.embedUrl = recommendation.provider === 'Videolectures.NET' ?
                            `${recommendation.url}iframe/1/` : recommendation.url;
                    });

                    // save recommendations
                    let recLength = recommendations.length;
                    options.recommendations = {
                        length: recLength,
                        documents: recommendations.slice(MAX_DOCS * (query.page - 1), MAX_DOCS * query.page)
                    };

                    // get number of pages - limit is set to 10 documents per page
                    let maxPages = Math.ceil(recLength / MAX_DOCS);

                    let quickSelect = [];
                    for (let i = query.page - 2; i < query.page + 3; i++) {
                        if (i < 1 || maxPages < i) { continue; }
                        quickSelect.push({ pageN: i, active: i === query.page });
                    }

                    // save pagination values
                    options.pagination = {
                        current: query.page,
                        max: maxPages,
                        get onFirstPage() { return this.current === 1; },
                        get onLastPage() { return this.current === this.max; },
                        get previous() { return this.current - 1; },
                        get next() { return this.current + 1; },
                        quickSelect
                    };

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