/** ******************************************************************
 * Forward Message to Kafka Topic
 * This component forwards the provided message to the
 * appropriate kafka topic and service.
 */

// internal modules
const KafkaProducer = require("@library/kafka-producer");

/**
 * @class KafkaSender
 * @description Sends the messages to the corresponding kafka topic.
 */
class KafkaForward {
    constructor() {
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[KafkaForward ${this._name}]`;

        this._producer = new KafkaProducer(config.kafka_host);
        this._kafka_topic = config.kafka_topic;
        callback();
    }

    heartbeat() {
        // do something if needed
    }

    shutdown(callback) {
        // shutdown component
        callback();
    }

    receive(message, stream_id, callback) {
        // send the message to the database topics
        this._producer.send(this._kafka_topic, message, (error) => {
            if (error) { return callback(error); }
            return callback();
        });
    }
}

exports.create = function (context) {
    return new KafkaForward(context);
};
