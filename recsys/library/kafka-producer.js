/** **********************************************
 * Kafka Producer Module
 * This module creates a kafka producer which
 * can create new messages and send them to
 * the assigned kafka topic.
 */

// external modules
const k = require("kafka-node");

/**
 * Kafka producer class.
 */
class KafkaProducer {
    /**
     * Initializes a kafka producer.
     * @param {String} host - The kafka host in the form of ip:port (Example: 127.0.0.1:9092).
     */
    constructor(host) {
        let self = this;

        const options = {
            kafkaHost: host
        };

        this._ready = false;
        this._messages = [];
        const client = new k.KafkaClient(options);
        // create a kafka producer
        self._producer = new k.HighLevelProducer(client);

        // make the producer ready
        self._producer.on("ready", () => {
            self._ready = true;
            // check if there are any messages not sent
            if (self._messages.length) {
                // send all messages
                while (self._messages.length) {
                    // get the first element from the array of messages
                    const message = self._messages[0];
                    // update the messages array
                    self._messages = self._messages.slice(1);
                    // send the message to the corresponsing topic
                    self._producer.send([message], (xerror) => {
                        if (xerror) { console.log(xerror); }
                    });
                }
            }
        });
    }

    /**
     * Sends the message to the appropriate topic.
     * @param {String} topic - The topic where the message is sent.
     * @param {Object} msg - The message.
     * @param {Function} [cb] - The callback triggered after.
     * the message was sent to the kafka topic.
     */
    send(topic, msg, cb) {
        let self = this;


        // get set callback value
        let callback = cb && typeof (cb) === "function"
            ? cb : function (error) { if (error) console.log(error); };


        // prepare the message in string
        const messages = JSON.stringify(msg);
        if (self._ready) {
            // the producer is ready to send the messages
            const payload = [{ topic, messages, attributes: 1 }];
            self._producer.send(payload, (xerror) => {
                if (xerror) { return callback(xerror); }
                return callback(null);
            });
        } else {
            // store the topic and message to send afterwards
            self._messages.push({ topic, messages });
            return callback(null);
        }
    }
}

module.exports = KafkaProducer;
