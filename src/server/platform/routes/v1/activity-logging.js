// external modules
const router = require('express').Router();
const handlebars = require('handlebars');
const path = require('path');
const fs = require('fs');

// internal modules
const validator = require('../../../../lib/schema-validator')({
    userActivitySchema: require('../../schemas/user-activity-schema')
});

/**
 * Adds API routes for logging user activity.
 * @param {Object} pg - Postgres connection wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (pg, logger) {
    // parameters used within the routes
    const x5gonCookieName = 'x5gonTrack';

    // set user activity tracker
    router.get('/snippet/tracker', (req, res) => {
        // TODO: validate the parameters

        // get query parameters
        let query = req.query;
        // create a handlebars compiler
        let activityTracker = fs.readFileSync(path.join(__dirname, '../../templates/tracker.hbs'));
        let hbs = handlebars.compile(activityTracker.toString('utf-8'));

        // send the website with cookie generation
        return res.send(hbs({ callbackURL: query.callbackURL, x5gonCookieName }));
    });

    // get client activity from the repository
    router.get('/snippet/log', (req, res) => {
        // log client activity
        logger.info('client requested activity logging',
            logger.formatRequest(req)
        );

        // the beacon used to acquire user activity data
        let beaconPath = path.join(__dirname, '../../public/images/beacon.png');
        // get query parameters
        let userParameters = req.query;

        // validate query schema
        if (!Object.keys(userParameters).length ||
            !validator.validateSchema(userParameters, validator.schemas.userActivitySchema)) {
            // the user parameters object is either empty or is not in correct schema
            const provider = userParameters.cid ? userParameters.cid : 'unknown';
            // log postgres error
            logger.error('error [route_body]: client activity logging failed',
                logger.formatRequest(req, { 
                    error: 'The body of the request is not in valid schema',
                    provider 

                })
            );
            // send beacon image to user
            return res.sendFile(beaconPath);
        }

        // get the user id from the X5GON tracker
        let uuid = req.cookies[x5gonCookieName] ?
            req.cookies[x5gonCookieName] :
            'unknown:not-tracking';

        // prepare the acitivity object
        let activity = {
            uuid: uuid,
            provider: userParameters.cid,
            url: userParameters.rq,
            referrer: userParameters.rf,
            visitedOn: userParameters.dt,
            userAgent: req.get('user-agent'),
            language: req.get('accept-language')
        };

        // store the client activity into postgres
        pg.insert(activity, 'client_activity', (error) => {
            if (error) {
                // log postgres error
                logger.error('error [postgres.insert]: client activity logging failed',
                    logger.formatRequest(req, { error: error.message })
                );
            } else {
                // log postgres success
                logger.info('client activity logging successful',
                    logger.formatRequest(req)
                );
            }
            // send beacon image to user
            return res.sendFile(beaconPath);
        });
    });

    // sends the snippet of the given version
    router.get('/snippet/:version/x5gon-log(.min)?.js', (req, res) => {
        // TODO: check if the parameters are valid

        // get the version parameter
        const version = req.params.version;

        // get the file name
        let originalUrl = req.originalUrl.split('/');
        const file = originalUrl[originalUrl.length - 1];
        // create the file path
        const filePath = path.join(__dirname, `../../public/snippet/global/${version}/${file}`);

        // generate a the tracker cookie - if not exists
        if (!req.cookies[x5gonCookieName]) {
            // generate the cookie value
            let cookieValue = Math.random().toString().substr(2) + "X" + Date.now();
            // set expiration date for the cookie
            let expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + 3650);
            // set the cookie for the user
            res.cookie(x5gonCookieName, cookieValue, { expires: expirationDate, httpOnly: true });
        }

        // send the file of the appropriate version
        res.sendFile(filePath);
    });

    return router;
};