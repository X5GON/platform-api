/** **********************************************
 * Kafka Producer Module
 * This module creates a kafka producer which
 * can create new messages and send them to
 * the assigned kafka topic.
 */

// external modules
const { Kafka } = require("kafkajs");

/**
 * Kafka producer class.
 */
class KafkaProducer {
    /**
     * Initializes a kafka producer.
     * @param {String} host - The kafka host in the form of ip:port (Example: 127.0.0.1:9092).
     * @param {String} [clientId] - The client ID.
     *
     */
    constructor(host, clientID = null) {
        let self = this;

        const clientId = clientID || `${Date.now()}`;

        this._kafka = new Kafka({
            clientId,
            brokers: [host],
            logCreator: () => () => {}
        });

        this._producer = this._kafka.producer();

        this._ready = false;
        this._payloads = [];
    }

    /**
     * @description Connect the producer to the broker.
     * @returns {Boolean} The ready value.
     */
    async connect() {
        await this._producer.connect();
        this._ready = true;
        if (this._payloads.length) {
            // send all messages to the appropriate topic
            while (this._payloads.length) {
                const message = this._payloads[0];
                this._payloads = this._payloads.slice(1);
                // eslint-disable-next-line no-await-in-loop
                await this._producer.send(message);
            }
        }
        return this._ready;
    }

    /**
     * @description Disconnect from the broker.
     * @returns {Boolean} The ready value.
     */
    async disconnect() {
        await this._producer.disconnect();
        this._ready = false;
        return this._ready;
    }

    /**
     * Sends the message to the appropriate topic.
     * @param {String} topic - The topic where the message is sent.
     * @param {Object} msg - The message.
     * @returns {Boolean} The notification if the message was sent to the broker or not.
     */
    async send(topic, msg) {
        try {
            const messages = [{ value: JSON.stringify(msg) }];
            const payload = { topic, messages };
            if (this._ready) {
                await this._producer.send(payload);
            } else {
                this._payloads.push(payload);
            }
            return true;
        } catch (e) {
            return false;
        }
    }
}

module.exports = KafkaProducer;
