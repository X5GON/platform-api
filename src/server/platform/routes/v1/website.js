// external modules
const router = require('express').Router();
const request = require('request');

/**
 * @description Adds API routes for platform website requests.
 * @param {Object} pg - Postgres connection wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (pg, logger, config) {

    /********************************************
     * Helper functions
     *******************************************/

    /**
     * @description Generates a token for the seed string.
     * @param {String} seed - The seed string used to generate token.
     * @return {String} The token used to indentify the repository.
     */
    function _generateToken(seed) {
        let token = 0;
        if (seed.length === 0) return hash;
        // convert the string into a hash
        for (let i = 0; i < seed.length; i++) {
            let char = seed.charCodeAt(i);
            token = `${token}${char}`;
            token = token & token; // convert to 32bit integer
        }
        // convert the deciman token to hex equivalent
        return Math.abs(token).toString(36);
    }


    /**
     * @description Verify user with the given recaptcha response.
     * @param {String} gRecaptchaResponse - The google recaptcha response.
     * @returns {Promise} The promise of the verification.
     * @private
     */
    function _googleVerifyUser(gRecaptchaResponse) {
        // create a request promise
        return new Promise((resolve, reject) => {
            // make a request for captcha validation
            request.post({
                url: config.platform.google.reCaptcha.verifyUrl,
                form: {
                    secret: config.platform.google.reCaptcha.secret,
                    response: gRecaptchaResponse,
                }
            }, (error, httpResponse, body) => {
                    // handle error on request
                    if (error) { return reject(error); }
                    // otherwise return the request body
                    return resolve(JSON.parse(body));
                }
            );
        });
    }


    /********************************************
     * PORTAL PAGES
     */

    router.get('/', (req, res) => {
        // currently redirect to form page
        res.redirect('/application-form');
    });

    // send application form page
    router.get('/application-form', (req, res) => {
        // check if the user was successfully validated by google captcha
        // this is used only when redirected from POST /repository
        const invalid = req.query.invalid ? req.query.invalid == 'true' : false;
        const recaptchaSiteKey = config.platform.google.reCaptcha.siteKey;
        return res.render('application-form', { recaptchaSiteKey, invalid, title: 'Join' });
    });

    router.get('/oer-provider', (req, res) => {
        // get token used for accessing data
        const name = req.query.name;
        const token = req.query.providerId;
        const referrer = req.header('Referrer') ?
            req.header('Referrer').split('?')[0] :
            '/application-form';
        // check if the repository already exists - return existing token
        pg.select({ name, token }, 'providers', (error, results) => {
            if (error) {
                logger.warn('error when retrieving repository data from table=providers', {
                    table: 'providers',
                    error
                });
                res.redirect(`${referrer}?invalid=true`);
             }

            if (results.length === 0) {
                return res.redirect(`${referrer}?invalid=true`);
            } else {
                // there are registered repositories in the database
                const { name, domain, contact, token } = results[0];
                // render the form submition
                return res.render('oer-provider', { name, domain, contact, token, title: 'OER Provider Information' });
            }
        });
    });

    // send repository
    router.post('/oer-provider', (req, res) => {
        // get body request
        const body = req.body;

        // get repository name, domain and contact
        const name = body.name;
        const domain = body.domain;
        const contact = body.contact;

        // verify user through google validation
        const gRecaptchaResponse = body["g-recaptcha-response"];
        _googleVerifyUser(gRecaptchaResponse)
            .then(validation => {

                // if not validated - redirect to application form
                if (!validation.success) { return res.redirect('/application-form?invalid=true'); }

                // check if the repository already exists - return existing token
                pg.select({ name, domain, contact }, 'providers', (error, results) => {
                    // log error
                    if (error) { console.log(error); }

                    if (results.length === 0) {
                        // there is no registered repositories in the database

                        // create the repository token
                        let seed = `${name}${domain}${Date.now()}
                                    ${Math.random().toString(36).substring(2)}`.repeat(3);
                        const token = _generateToken(seed);

                        // insert repository information to postgres
                        pg.insert({ name, domain, contact, token }, 'providers', (xerror, xresults) => {
                            // render the form submition
                            return res.redirect(`/oer-provider?name=${name}&providerId=${token}`);
                        });

                    } else {
                        // there are registered repositories in the database
                        const { token } = results[0];
                        // render the form submition
                        return res.redirect(`/oer-provider?name=${name}&providerId=${token}`);
                    }
                });
            })
            .catch(error => {
                // TODO: handle error
                console.log(error);
            });
    });

    router.get('/oer-provider/login', (req, res) => {
        const invalid = req.query.invalid;
        return res.render('oer-provider-login', { invalid, title: 'Login' });
    });

    // send application form page
    router.get('/privacy-policy', (req, res) => {
        return res.render('privacy-policy', { title: 'Privacy Policy' });
    });


    /********************************************
     * RECOMMENDATION SEARCH
     */

    // maximum numbers of documents in recommendation list
    const MAX_DOCS = 10;

    router.get('/search', (req, res) => {
        if (Object.keys(req.query).length) {
            // get user query parameters and/or set initial ones
            let queryParams = req.query;
            queryParams.type = queryParams.type || 'all';
            queryParams.page = parseInt(queryParams.page) || 1;
            queryParams.count = parseInt(queryParams.count) || 10000;

            let queryString = Object.keys(queryParams).map(key => `${key}=${encodeURIComponent(queryParams[key])}`).join('&');
            request(`http://localhost:${config.platform.port}/api/v1/recommend/materials?${queryString}`, (error, httpRequest, body) => {
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
                            let abstract = recommendation.description.split('.').slice(0, 2).join('. ');

                            for (let word of queryParams.text.split(' ')) {
                                const pattern = new RegExp(word, 'gi');
                                abstract = abstract.replace(pattern, str => `<b>${str}</b>`);
                            }

                            if (recommendation.description !== abstract) { recommendation.description = `${abstract}. ...`; }
                        }
                        // embed url
                        recommendation.embedUrl = recommendation.url;
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
                return res.render('search-results', { layout: 'search', query, options });

            });

            // currently redirect to form page
        } else {
            // currently redirect to form page
            return res.render('search', { layout: 'search' });
        }
    });

    /********************************************
     * RECOMMENDATION EMBEDDINGS
     */

    /**
     * @api {GET} /embed/recommendations Ember-ready recommendation list
     * @apiDescription Gets the embed-ready recommendation list html
     * @apiName GetRecommendationsEmbedReady
     * @apiGroup Recommendations
     * @apiVersion 1.0.0
     *
     * @apiParam {String} [text] - The raw text. If both `text` and `url` are present, `url` has the priority.
     * @apiParam {String} [url] - The url of the material. If both `text` and `url` are present, `url` has the priority.
     * @apiParam {String="cosine","null"} [type] - The metrics used in combination with the url parameter.
     *
     * @apiSuccess (200) {String} list - The html of the embed-ready list.
     * @apiExample {html} Example usage:
     *      <iframe src="https://platform.x5gon.org/embed/recommendations?url=https://platform.x5gon.org/materialUrl&text=education"
     *          style="border:0px;height:425px;"></iframe>
     */
    router.get('/embed/recommendations', (req, res) => {
        const query = req.query;

        // recommender list style parameters
        const { width, height, fontSize } = query;
        let style = {
            width,
            height,
            fontSize
        };

        console.log(query);

        let options = { layout: 'empty', style };
        let queryString = Object.keys(query).map(key => `${key}=${encodeURIComponent(query[key])}`).join('&');
        console.log(queryString);
        request(`http://localhost:${config.platform.port}/api/v1/recommend/bundles?${queryString}`, (error, httpRequest, body) => {
            try {
                const recommendations = JSON.parse(body);
                options.empty = recommendations.length !== 0 || recommendations.error ? false : true;
                options.recommendations = recommendations;
                return res.render('recommendations', options);
            } catch(xerror) {
                options.empty = true;
                return res.render('recommendations', options);
            }
        });
    });



    /********************************************
     * ERROR PAGE
     */

    router.get('/error', (req, res) => {
        return res.render('error', { title: '404' });
    });


    return router;
};