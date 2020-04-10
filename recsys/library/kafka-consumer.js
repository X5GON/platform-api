/** **********************************************
 * Kafka Consumer Module
 * This module creates a kafka consumer which
 * can be used to listen on a particular kafka
 * topic and receive its messages.
 */

// external modules
const k = require("kafka-node");

/**
 * @class KafkaConsumer
 * @description Listens to a particular Kafka topic/channel
 * and stores and prepares the messages for consumption.
 */
class KafkaConsumer {
    /**
     * @description Initialize the Kafka consumer instance.
     * @param {String} host - The host address of the kafka service.
     * @param {String} topic - The topic kafka consumer is listening to.
     */
    constructor(host, topic, groupId, HIGH_WATER = 100, LOW_WATER = 10) {
        // the message container
        this._data = [];

        this.HIGH_WATER = HIGH_WATER;
        this.LOW_WATER = LOW_WATER;

        // setup the consumer options
        const options = {
            kafkaHost: host,
            ssl: true,
            groupId,
            sessionTimeout: 15000,
            protocol: ["roundrobin"],
            fromOffset: "latest",
            fetchMaxBytes: 1024 * 2048,
            commitOffsetsOnFirstJoin: true,
            outOfRangeOffset: "earliest",
            migrateHLC: false,
            migrateRolling: true,
            onRebalance: (isAlreadyMember, callback) => { callback(); }
        };

        // initialize the consumer group and flags
        this.consumerGroup = new k.ConsumerGroup(options, [topic]);
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
     * @description Enables message consumption.
     */
    enable() {
        if (!this._enabled) {
            if (!this._highWaterClearing) {
                this.consumerGroup.resume();
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
                this.consumerGroup.pause();
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
            if (this._data.length <= this.LOW_WATER) {
                this._highWaterClearing = false;
                this.consumerGroup.resume();
            }
            return msg;
        } else {
            return null;
        }
    }

    /**
     * Stops and closes the consumer group.
     * @param {Function} cb - Callback function.
     */
    stop(cb) {
        this.consumerGroup.close(true, cb);
    }
}

module.exports = KafkaConsumer;
