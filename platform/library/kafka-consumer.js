/** **********************************************
 * Kafka Consumer Module
 * This module creates a kafka consumer which
 * can be used to listen on a particular kafka
 * topic and receive its messages.
 */

// external modules
const { Kafka } = require("kafkajs");

/**
 * @class KafkaConsumer
 * @description Listens to a particular Kafka topic/channel
 * and stores and prepares the messages for consumption.
 */
class KafkaConsumer {
    /**
     * @description Initialize the Kafka consumer instance.
     * @param {Object} params - The kafka consumer parameters.
     * @param {String} params.host - The host address of the kafka service.
     * @param {String} params.groupId - The group ID of the kafka consumers.
     * @param {String} params.topic - The kafka topic from which the consumer retrieves the messages.
     * @param {String} params.clientId - The client ID.
     * @param {Number} params.highWater - The maximum number of messages the consumer retrieves before it pauses.
     * @param {Number} params.lowWater - The minimum number of messages the consumer retrieves before it retrieves.
     * @param {Boolean} params.fromBeginning - Decides if the consumer gathers the messages from the the beginning or not.
     */
    constructor(params) {
        const {
            host,
            groupId,
            topic,
            clientId,
            highWater = 100,
            lowWater = 10,
            fromBeginning
        } = params;

        this._kafka = new Kafka({
            clientId,
            brokers: [host],
            logCreator: () => () => {}
        });

        // the message container
        this._data = [];
        this._topic = topic;
        this._highWater = highWater;
        this._lowWater = lowWater;
        this._fromBeginning = fromBeginning || false;

        this._consumer = this._kafka.consumer({ groupId });

        this._highWaterClearing = false;
        this._enabled = true;

        // setup the listener
        this.consumerGroup.on("message", (message) => {
            if (message.value === "") { return; }
            // push the new message to the container
            this._data.push(JSON.parse(message.value));

            // handle large amount of data
            if (this._data.length >= this.HIGH_WATER) {
                this._highWaterClearing = true;
                this.consumerGroup.pause();
            }
        });
    }

    /**
     * @description Connects the kafka consumer to the brokers.
     */
    async connect() {
        await this._consumer.connect();
        await this._consumer.subscribe({
            topic: this._topic,
            fromBeginning: this._fromBeginning
        });
        await this._consumer.run({
            eachMessage: async ({ message }) => {
                const messageValue = message.value.toString();
                if (messageValue === "") { return; }
                this._data.push(JSON.parse(messageValue));
                if (this._data.length >= this._highWater) {
                    this._highWaterClearing = true;
                    this._consumer.pause([{ topic: this._topic }]);
                }
            }
        });
    }

    /**
     * @description Enables message consumption.
     */
    enable() {
        if (!this._enabled) {
            if (!this._highWaterClearing) {
                this._consumer.resume([{ topic: this._topic }]);
            }
            this._enabled = true;
        }
    }

    /**
     * @description Disable/pause message consumption.
     */
    disable() {
        if (this._enabled) {
            if (!this._highWaterClearing) {
                this._consumer.pause([{ topic: this._topic }]);
            }
            this._enabled = false;
        }
    }

    /**
     * @description Get the next message.
     * @returns {Null|Object} The message object if present. Otherwise, returns null.
     */
    next() {
        if (!this._enabled) {
            return null;
        }
        if (this._data.length > 0) {
            let msg = this._data[0];
            this._data = this._data.slice(1);
            if (this._data.length <= this._lowWater) {
                this._highWaterClearing = false;
                this._consumer.resume([{ topic: this._topic }]);
            }
            return msg;
        } else {
            return null;
        }
    }
}

module.exports = KafkaConsumer;
