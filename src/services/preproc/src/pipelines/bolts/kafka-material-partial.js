/** ******************************************************************
 * PostgresQL storage process
 * This component receives the verified OER material object and
 * stores it into postgresQL database.
 */

// internal modules
const KafkaProducer = require("@library/kafka-producer");

/**
 * @class KafkaSender
 * @description Sends the messages to the corresponding kafka topic.
 */
class KafkaMaterialPartial {
    constructor() {
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[KafkaMaterialPartial ${this._name}]`;

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

    receive(material, stream_id, callback) {
        // rebrand the attribute name
        let authors = material.author;
        if (authors) {
            authors = authors.replace(/[{\"}]/g, "");
            authors = authors.split(",").map((str) => str.trim());
            if (authors.length === 1 && authors[0] === "") {
                authors = null;
            }
        }
        material.authors = authors;
        delete material.author;
        // prepare message
        const message = {
            oer_materials_partial: material
        };

        // send the message to the database topics
        this._producer.send(this._kafka_topic, message, (error) => {
            if (error) { return callback(error); }
            return callback();
        });
    }
}

exports.create = function (context) {
    return new KafkaMaterialPartial(context);
};
