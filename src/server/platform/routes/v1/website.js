// external modules
const router = require('express').Router();
const handlebars = require('handlebars');
const request = require('request');

// google verification configuration
const gConfig = require('../../config/googleconfig');

/********************************************
 * Helper functions
 *******************************************/

/**
 * Verify user with the given recaptcha response.
 * @param {String} gRecaptchaResponse - The google recaptcha response.
 * @returns {Promise} The promise of the verification.
 * @private
 */
function _googleVerifyUser(gRecaptchaResponse) {
    // create a request promise
    return new Promise((resolve, reject) => {
        // make a request for captcha validation
        request.post({ 
            url: gConfig.reCaptcha.verifyUrl, 
            form: {
                secret: gConfig.reCaptcha.secret,
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

/**
 * Generates a token for the seed string.
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
 * Adds API routes for platform website requests.
 * @param {Object} pg - Postgres connection wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (pg, logger) {

    // send application form page
    router.get('/', (req, res) => {
        // check if the user was successfully validated by google captcha
        // this is used only when redirected from POST /repository
        const invalid = req.query.invalid ? req.query.invalid == 'true' : false;

        const recaptchaSiteKey = gConfig.reCaptcha.siteKey;
        return res.render('index', { recaptchaSiteKey, invalid });
    });

    // send repository
    router.post('/repository', (req, res) => {
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
                if (!validation.success) { return res.redirect('/?invalid=true'); }

                // check if the repository already exists - return existing token
                pg.select({ name, domain, contact }, 'repositories', (error, results) => {
                    // log error
                    if (error) { console.log(error); }
                    
                    if (results.length === 0) {
                        // there is no registered repositories in the database

                        // create the repository token
                        let seed = `${name}${domain}${Date.now()}
                                    ${Math.random().toString(36).substring(2)}`.repeat(3);
                        const token = _generateToken(seed);

                        // insert repository information to postgres
                        pg.insert({ name, domain, contact, token }, 'repositories', (xerror, xresults) => {
                            // render the form submition
                            return res.render('repository', { name, domain, contact, token });
                        });

                    } else {
                        // there are registered repositories in the database
                        const { name, domain, contact, token } = results[0];
                        // render the form submition
                        return res.render('repository', { name, domain, contact, token });
                    }
                });
            })
            .catch(error => {
                // TODO: handle error
                console.log(error);
            });
    });

    return router;
};