// external modules
const k = require('kafka-node');

/**
 * Kafka producer class.
 */
class KafkaProducer {

    constructor(config) {
        let self = this;
        const options = {
            kafkaHost: config.host
        };

        this._ready = false;
        const client = new k.KafkaClient(options);
        this._producer = new k.HighLevelProducer(client);

        // make the producer ready
        this._producer.on('ready', function () {
            self._ready = true;
        });
    }

    /**
     * Sends the message to the appropriate topic.
     * @param {String} topic - The topic where the message is sent.
     * @param {Object} msg - The message.
     */
    send(topic, msg) {
        let self = this;
        if (self._ready) {
            // the producer is ready
            self._producer.createTopics([topic], false, (error, data) => {
                if (error) { console.log(error); }
                const messages = JSON.stringify(msg);
                const payload = [{ topic, messages }];
                self._producer.send(payload, (xerror, data) => {
                    if (xerror) { console.log(xerror); }
                });
            });
        }
    }

}

module.exports = KafkaProducer;