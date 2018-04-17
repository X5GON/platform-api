// external modules
const router = require('express').Router();
const handlebars = require('handlebars');
const path = require('path');
const fs = require('fs');
// internal modules
const validator = require('../../../lib/utils/schema-validator')({
    userActivitySchema: require('../../../schemas/user-activity-schema')
});

/**
 * Adds API routes for logging user activity.
 * @param {Object} pg - Postgres connection wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (pg, logger) {

    // set user activity tracker
    router.get('/activity-tracker', (req, res) => {

        // get query parameters
        let query = req.query;
        // create a handlebars compiler
        let activityTracker = fs.readFileSync(path.join(__dirname, '../../templates/activity-tracker.hbs'));
        let hbs = handlebars.compile(activityTracker.toString('utf-8'));

        // send the website with cookie generation
        return res.send(hbs({ callbackURL: query.callbackURL }));

    });

    // GET client activity
    router.get('/log', (req, res) => {
        // log client activity
        logger.info('client requested activity logging',
            logger.formatRequest(req)
        );

        // return a transparent image - the beacon
        let beaconPath = path.join(__dirname, '../../public/images/beacon.png');
        // get query parameters
        let userParameters = req.query;

        // validate query schema
        if (!Object.keys(userParameters).length ||
            !validator.validateSchema(userParameters, validator.schemas.userActivitySchema)) {
            // the user parameters object is either empty or is not in correct schema

            // log postgres error
            logger.error('error [route_body]: client activity logging failed',
                logger.formatRequest(req, { error: 'The body of the request is not in valid schema' })
            );
            // send beacon image to user
            return res.sendFile(beaconPath);
        }

        // get the user id from the X5GON tracker
        let uuid = req.cookies.x5gonTrack;

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


    return router;
};