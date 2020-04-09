// external modules
const router = require("express").Router();
const request = require("request");

// internal modules
const KafkaProducer = require("../../../../library/kafka-producer");

/**
 * @description Adds API routes for platform website requests.
 * @param {Object} pg - Postgres connection wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (pg, logger, config) {
    // //////////////////////////////////////
    // Helper functions
    // //////////////////////////////////////

    // initialize kafka producer
    const producer = new KafkaProducer(config.kafka.host);

    /**
     * @description Generates a token for the seed string.
     * @param {String} seed - The seed string used to generate token.
     * @return {String} The token used to indentify the repository.
     */
    function _generateToken(seed) {
        let token = 0;
        if (seed.length === 0) return seed;
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
            });
        });
    }


    // //////////////////////////////////////
    // Portal Pages
    // //////////////////////////////////////

    router.get("/api/v1/oer_provider", async (req, res) => {
        // get token used for accessing data
        const token = req.query.providerId;

        if (!token) {
            // provider is not registered in the platform
            logger.warn("[warn] token was not provided by the user",
                logger.formatRequest(req));
            // redirect user to previous page
            return res.json({ error: "token was not provided by the user" });
        }

        try {
            // check if the repository already exists - return existing token
            const results = await pg.selectProviderStats(token);
            if (results.length === 0) {
                // provider is not registered in the platform
                logger.warn("[warn] postgresql provider not registered in X5GON platform",
                    logger.formatRequest(req));
                // redirect user to previous page
                return res.json({ error: "no OER provider registered with the given token" });
            } else {
                // provider is not registered in the platform
                logger.info("[info] provider requested for its information",
                    logger.formatRequest(req));
                // render the form submition
                return res.send({
                    ...results[0]
                });
            }
        } catch (error) {
            // error when retrieving provider data
            logger.error("[error] postgresql",
                logger.formatRequest(req, {
                    error: {
                        message: error.message,
                        stack: error.stack
                    }
                }));
            // redirect user to previous page
            return res.json({ error: "error on server side" });
        }
    });

    // send repository
    router.post("/api/v1/oer_provider", async (req, res) => {
        // get body request
        const body = req.body;

        // get repository name, domain and contact
        const name = body.name;
        const domain = body.domain;
        const contact = body.contact;
        const referrer = req.header("Referrer")
            ? req.header("Referrer").split("?")[0]
            : "/join";

        // verify user through google validation
        const gRecaptchaResponse = body["g-recaptcha-response"];

        let validation;
        try {
            validation = await _googleVerifyUser(gRecaptchaResponse);
        } catch (error) {
            // provider is not registered in the platform
            logger.error("[error] google user verification error",
                logger.formatRequest(req, {
                    error: {
                        message: error.message,
                        stack: error.stack
                    }
                }));
            // redirect user to join page
            return res.redirect("/join?invalid=true");
        }


        // if not validated - redirect to join form
        if (!validation.success) {
            // provider is a robot
            logger.warn("[warn] provider is a robot",
                logger.formatRequest(req));
            // redirect user to join page
            return res.redirect(`${referrer}?invalid=true`);
        }

        let results;
        try {
            // check if the repository already exists - return existing token
            results = await pg.select({ name, domain, contact }, "providers");
        } catch (error) {
            // error when retrieving data
            logger.error("[error] postgresql",
                logger.formatRequest(req, {
                    error: {
                        message: error.message,
                        stack: error.stack
                    }
                }));
            // redirect user to previous page
            return res.redirect(`${referrer}?invalid=true`);
        }

        if (results.length === 0) {
            // there is no registered repositories in the database

            // create the repository token
            let seed = `${name}${domain}${Date.now()}
                        ${Math.random().toString(36).substring(2)}`.repeat(3);
            const token = _generateToken(seed);

            try {
                // insert repository information to postgres
                await pg.insert({
                    name, domain, contact, token
                }, "providers");
                // redirect activity to information retrievers
                producer.send("STORE_PROVIDER", {
                    name, domain, contact, token
                });
                // render the form submition
                return res.redirect(`/oer_provider?repositoryToken=${token}`);
            } catch (xerror) {
                // error when retrieving data
                logger.error("[error] inserting provider data",
                    logger.formatRequest(req, {
                        error: {
                            message: xerror.message,
                            stack: xerror.stack
                        }
                    }));
                // redirect user to previous page
                return res.redirect(`${referrer}?unsuccessful=true`);
            }
        } else {
            // there are registered repositories in the database
            const { token } = results[0];
            // render the form submition
            return res.redirect(`/oer_provider?repositoryToken=${token}`);
        }
    });


    // //////////////////////////////////////
    // Material Search
    // //////////////////////////////////////

    // maximum numbers of documents in recommendation list
    const MAX_DOCS = 10;

    router.get("/search", (req, res) =>
        // redirect user to join page
        res.redirect("http://discovery.x5gon.org/"));


    // //////////////////////////////////////
    // Recommendation Embeddings
    // //////////////////////////////////////

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
    router.get("/embed/recommendations", (req, res) => {
        const query = req.query;

        // recommender list style parameters
        let style = {
            width: query.width,
            height: query.height,
            fontSize: query.fontSize
        };

        let options = { layout: "empty", style, empty: true };
        let queryString = Object.keys(query).map((key) => `${key}=${encodeURIComponent(query[key])}`).join("&");
        request(`http://localhost:${config.recsys.port}/api/v1/recommend/bundles?${queryString}`, (error, httpRequest, body) => {
            if (error) {
                // error when making material request
                logger.error("[error] request for material bundles",
                    logger.formatRequest(req, {
                        error: {
                            message: error.message,
                            stack: error.stack
                        }
                    }));
                // render recommendations
                return res.render("recommendations", options);
            }

            try {
                const recommendations = JSON.parse(body);
                options.empty = !(recommendations.length !== 0 || recommendations.error);
                options.query = query;
                options.recommendations = recommendations;

                if (options.query.url) {
                    // encode query url if present
                    options.query.url = encodeURIComponent(options.query.url);
                    options.recommendations.forEach((material) => { material.url = encodeURIComponent(material.url); });
                }
                // encode all material urls
                options.recommended_urls = options.recommendations.map((material) => encodeURIComponent(material.url));
            } catch (xerror) {
                // error when processing materials
                logger.error("[error] processing material bundles",
                    logger.formatRequest(req, {
                        error: {
                            message: xerror.message,
                            stack: xerror.stack
                        }
                    }));
            }
            // render recommendations
            return res.render("recommendations", options);
        });
    });


    // //////////////////////////////////////
    // End of Router
    // //////////////////////////////////////

    return router;
};
