// external modules
const router = require("express").Router();
const handlebars = require("handlebars");
const path = require("path");
const fs = require("fs");
const url = require("url");
const cors = require("cors");

// internal modules
const KafkaProducer = require("@library/kafka-producer");
const validator = require("@library/schema-validator")({
    userActivitySchema: require("@platform_schemas/user-activity-schema")
});

// module for preparing materials
const PrepareMaterials = require("@library/prepare-materials");

const prepareMaterials = new PrepareMaterials();

/**
 * @description Adds API routes for logging user activity.
 * @param {Object} logger - The logger object.
 * @param {Object} config - The configuration object.
 */
module.exports = function (logger, config) {
    // //////////////////////////////////////
    // Static variables
    // //////////////////////////////////////

    // parameters used within the routes
    const x5gonCookieName = config.platform.cookieID;

    // initialize kafka producer
    const producer = new KafkaProducer(config.kafka.host);


    // //////////////////////////////////////
    // Helper functions
    // //////////////////////////////////////

    /**
     * @description Validates the user requests and returns the options/headers
     * for the beacon image & the user parameters.
     * @param {Object} req - The express request object.
     * @returns {Object} The options and user parameters.
     * @private
     */
    function _evaluateLog(req) {
        // get query parameters
        let userParameters = { };

        userParameters.x5gonValidated = decodeURIComponent(req.query.x5gonValidated);
        userParameters.dt = decodeURIComponent(req.query.dt);
        userParameters.rq = decodeURIComponent(req.query.rq);
        userParameters.rf = decodeURIComponent(req.query.rf);
        userParameters.cid = decodeURIComponent(req.query.cid);

        // set the snippet status headers
        // notifying the user about the success or failure
        let options = {
            headers: {
                "x-snippet-date": new Date(),
                "x-snippet-status": "success",
                "x-snippet-message": null
            }
        };

        // calidate the request parameters with the user activity schema
        const validation = validator.validateSchema(userParameters, validator.schemas.userActivitySchema);

        // validate query schema
        if (!Object.keys(userParameters).length || !validation.isValid) {
            options.headers["x-snippet-status"] = "failure";
            // TODO: add a good description of what went wrong
            options.headers["x-snippet-message"] = "check if all parameters are set and if the date-time is in the correct format";
        }
        // return options and user parameters
        return { options, userParameters, validation };
    }


    /**
     * @description Checks if the request has been povided by a bot.
     * @param {Object} req - The express request object.
     * @returns {Boolean} True if the request was given by a bot.
     * @private
     */
    function _isBot(req) {
        if (!req.get("user-agent")) {
            return true;
        }
        let userAgent = req.get("user-agent").toLowerCase();
        return userAgent.includes("bot") || userAgent.includes("preview");
    }


    // //////////////////////////////////////
    // Connect service routes
    // //////////////////////////////////////

    /**
     * The route used for on-premise Connect service integration.
     * @param {String} callbackURL - The URL used to return to the website.
     */
    router.get("/snippet/tracker", cors(), (req, res) => {
        // TODO: validate the parameters

        // get query parameters
        let query = req.query;
        // create a handlebars compiler
        let activityTracker = fs.readFileSync(path.join(__dirname, "../../../snippet/templates/tracker.hbs"));
        let hbs = handlebars.compile(activityTracker.toString("utf-8"));

        // send the website with cookie generation
        return res.send(hbs({ callbackURL: query.callbackURL, x5gonCookieName }));
    });


    /**
     * Decides to which route to direct the request.
     * @param {String} test - The string/boolean if the request was done for testing or not.
     */
    router.get("/snippet/log", cors(), (req, res) => {
        // check and convert to boolean
        const testing = req.query.test === "true" || false;
        if (testing) {
            // development environment
            res.redirect(url.format({
                pathname: "/api/v1/snippet/log/development",
                query: req.query
            }));
        } else {
            // production environment
            res.redirect(url.format({
                pathname: "/api/v1/snippet/log/production",
                query: req.query
            }));
        }
    });


    /**
     * Returns beacon for testing/development case.
     */
    router.get("/snippet/log/development", cors(), (req, res) => {
        // the beacon used to acquire user activity data
        let beaconPath = path.join(__dirname, "../../../snippet/images/beacon.png");
        // get the options - snippet status headers
        const { options } = _evaluateLog(req);
        // send beacon image to user
        return res.sendFile(beaconPath, options);
    });


    /**
     * Returns the beacon for the production case.
     */
    router.get(["/connect/visit", "/snippet/log/production"], cors(), (req, res) => {
        // the beacon used to acquire user activity data
        let beaconPath = path.join(__dirname, "../../../snippet/images/beacon.png");
        // get the options - snippet status headers
        const { options, userParameters, validation } = _evaluateLog(req);
        // the user parameters object is either empty or is not in correct schema
        const provider = userParameters.cid ? userParameters.cid : "unknown";
        // validate query schema
        if (!validation.isValid) {
            // log user parameters error
            logger.error("[error] client activity logging not in correct format",
                logger.formatRequest(req, {
                    error: { validation: validation.errors },
                    provider
                }));
            // send beacon image to user
            return res.sendFile(beaconPath, options);
        }

        // check if the request was done by a bot
        if (_isBot(req)) {
            // log user parameters error
            logger.warn("[warn] client is a bot",
                logger.formatRequest(req, {
                    provider,
                    userAgent: req.get("user-agent")
                }));
            // send beacon image to user
            return res.sendFile(beaconPath, options);
        }

        let uuid;
        // generate a the tracker cookie - if not exists
        if (!req.cookies[x5gonCookieName]) {
            // generate the cookie value
            let cookieValue = `${Math.random().toString().substr(2)}X${Date.now()}`;
            // set expiration date for the cookie
            let expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + 3650);
            // set the cookie for the user
            res.cookie(x5gonCookieName, cookieValue, {
                expires: expirationDate,
                domain: ".x5gon.org",
                httpOnly: true
            });

            // set uuid of the user
            uuid = cookieValue;
        }

        if (!uuid) {
            // get the user id from the X5GON tracker
            uuid = req.cookies[x5gonCookieName]
                ? req.cookies[x5gonCookieName]
                : "unknown";
        }
        // get the material from the request
        const material = prepareMaterials.prepare(req.query);
        // prepare the acitivity object
        let activity = {
            uuid,
            provider: userParameters.cid,
            url: userParameters.rq,
            referrer: userParameters.rf,
            visitedOn: userParameters.dt,
            userAgent: req.get("user-agent"),
            language: req.get("accept-language"),
            type: "visit",
            ...(material && { material })
        };
        // redirect activity to information retrievers
        producer.send("STORE_USERACTIVITY_VISIT", activity);
        // send beacon image to user
        return res.sendFile(beaconPath, options);
    });

    /**
     * Handles the video activities in the video.
     */
    router.get(["/connect/video", "/snippet/log/video"], cors(), (req, res) => {
        // the beacon used to acquire user activity data
        let beaconPath = path.join(__dirname, "../../../snippet/images/beacon.png");
        // get the options - snippet status headers
        const { options, userParameters } = _evaluateLog(req);
        // the user parameters object is either empty or is not in correct schema
        const provider = userParameters.cid ? userParameters.cid : "unknown";

        if (_isBot(req)) {
            // log user parameters error
            logger.warn("[warn] client is a bot",
                logger.formatRequest(req, {
                    provider,
                    userAgent: req.get("user-agent")
                }));
            // send beacon image to user
            return res.sendFile(beaconPath, options);
        }

        // get the user id from the X5GON tracker
        const uuid = req.cookies[x5gonCookieName]
            ? req.cookies[x5gonCookieName]
            : "unknown";

        // create video activity object
        const video = {
            uuid,
            userAgent: req.get("user-agent"),
            language: req.get("accept-language"),
            type: "video"
        };

        // copy all query parameters to the object
        for (let key in req.query) {
            video[key] = req.query[key];
        }

        // redirect activity to information retrievers
        producer.send("STORE_USERACTIVITY_VIDEO", video);
        // send beacon image to user
        return res.sendFile(beaconPath, options);
    });

    /**
     * Provides the script/file containing the x5gon-log file.
     */
    router.get(["/connect/:version/x5gon-connect(.min)?.js", "/snippet/:version/x5gon-log(.min)?.js"], cors(), (req, res) => {
        // TODO: check if the parameters are valid

        // get the version parameter
        const version = req.params.version;
        // get the file name
        let originalUrl = req.originalUrl.split("/");
        const file = originalUrl[originalUrl.length - 1].split("?")[0];

        // create the file path
        const filePath = path.join(__dirname, `../../../snippet/global/${version}/${file}`);

        // send the file of the appropriate version
        res.sendFile(filePath);
    });


    return router;
};
