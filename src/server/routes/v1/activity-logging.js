// external modules 
const path = require('path');

/**
 * Adds API routes for the recommendations.
 * @param {Object} app - Express app.
 * @param {Object} pg - Postgres connection wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (app, pg, logger) {

    // GET client activity
    app.get('/api/v1/log', (req, res) => {
        // log client activity
        logger.info('client requested activity logging',
            logger.formatRequest(req)
        );

        // return a transparent image - the beacon 
        let beaconPath = path.join(__dirname + '../../../public/images/beacon.png');

        // get query parameters
        let query = req.query;

        // validate query schema
        // if (/* && !isValid(query) */) {
        //     // log postgres error
        //     logger.error('error [route_body]: client activity logging failed',
        //         logger.formatRequest(req, { error: 'The body of the request is not in valid schema' })
        //     );
        //     // send error to client
        //     return res.sendFile(beaconPath);
        // }

        // prepare the acitivity object
        let activity = {
            uuid: query.uid, 
            provider: query.cid, 
            url: query.rq, 
            referrer: query.rf, 
            visitedOn: query.dt
        };

        // TODO: store the client activity into postgres
        pg.insert(activity, 'client_activity', (error) => {
            if (error) {
                // log postgres error
                logger.error('error [postgres.insert]: client activity logging failed',
                    logger.formatRequest(req, { error: error.message })
                );
                // send error to client
                return res.sendFile(beaconPath);
            }
            // log postgres error
            logger.info('client activity logging successful',
                logger.formatRequest(req)
            );

            // send response to client
            return res.sendFile(beaconPath);
        });
    });

};