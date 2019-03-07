// external modules
const router = require('express').Router();

// internal modules
const KafkaProducer = require('@lib/kafka-producer');

/**
 * @description Adds API routes for logging user activity.
 * @param {Object} pg - Postgres connection wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (pg, logger, config) {

    // parameters used within the routes
    const x5gonCookieName = 'x5gonTrack';

    // initialize kafka producer
    const producer = new KafkaProducer(config.kafka.host);

    /**********************************
     * Helper functions
     *********************************/

    // TODO: write helper functions

    /**********************************
     * Middleware
     *********************************/

    router.use((req, res, next) => {

        // transform query parameters into lowercase
        const query_parameters = {};
        for (let key in req.query) {
            query_parameters[key.toLowerCase()] = req.query[key];
        }

        // get query parameters
        const { from, to } = query_parameters;

        /**********************************
         * check user parameters
         *********************************/

        // set error message container
        let error_msgs = [];

        if (!from) {
            error_msgs.push('Query parameter "from" must be provided');
        } else if (!from.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi)) {
            error_msgs.push('Query parameter "from" must be a valid url');
        }

        if (!to) {
            error_msgs.push('Query parameter "to" must be provided');
        } else if (!to.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi)) {
            error_msgs.push('Query parameter "to" must be a valid url');
        }

        /**********************************
         * notify the user about
         * the query parameter errors
         *********************************/

        if (error_msgs.length) {
            // notify the users of the parameters change
            return res.status(400).send({
                errors: { msgs: error_msgs }
            });
        }

        /**********************************
         * continue with request
         *********************************/

        // get the user id from the X5GON tracker
        query_parameters.uuid = req.cookies[x5gonCookieName] ?
                                req.cookies[x5gonCookieName] :
                                'unknown';

        // store the modified query parameters
        req.query_parameters = query_parameters;
        return next();
    });


    /**********************************
     * Routes
     *********************************/

    router.get('/transitions', (req, res) => {
        // get the query parameters
        const {
            from,
            to,
            uuid
        } = req.query_parameters;

        /**********************************
         * send the request to kafka
         *********************************/

        // send the message to the kafka topic
        producer.send('STORING.RECSYS.TRANSITIONS', { from, to, uuid });

        // redirect the request to the provided url
        res.redirect(to);
    });


    router.post('/transitions', (req, res) => {
        // get material id

        // TODO: implement the route
        return res.send(new Error('Route not implemented'));

    });

    return router;
};