// external modules
const router = require('express').Router();

// internal modules
const KafkaProducer = require('alias:lib/kafka-producer');

/**
 * @description Adds API routes for logging user activity.
 * @param {Object} pg - Postgres connection wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (pg, logger, config) {

    // initialize kafka producer
    const producer = new KafkaProducer(config.kafka.host);

    /**********************************
     * Helper functions
     *********************************/

    // TODO: write helper functions

    /**********************************
     * Middleware
     *********************************/

    router.use(['/upload/oer_materials'], (req, res, next) => {
        // TODO: validate api key

        // TODO: validate the uploaded material
        return next();
    });

    /**********************************
     * Routes
     *********************************/

    router.post('/upload/oer_materials', (req, res) => {
        // TODO: Send each material into the


        // send the message to the kafka topic
        producer.send('STORING.RECSYS.TRANSITIONS', {
            from, to, selected_position, recommended_urls, uuid
        });

    });

    return router;
};