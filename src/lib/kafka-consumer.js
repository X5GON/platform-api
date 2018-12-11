/************************************************
 * Kafka Consumer Spout
 * This component is listening to a Kafka topic
 * and then sends the message forward to the next
 * component in the topology.
 */

// external modules
const k = require('kafka-node');

const HIGH_WATER = 100;
const LOW_WATER = 10;

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
    constructor(host, topic) {
        // the message container
        this._data = [];

        // setup the consumer options
        const options = {
            kafkaHost: host,
            ssl: true,
            groupId: 'InputGroup',
            sessionTimeout: 15000,
            protocol: ['roundrobin'],
            fromOffset: 'earliest',
            commitOffsetsOnFirstJoin: true,
            outOfRangeOffset: 'earliest',
            migrateHLC: false,
            migrateRolling: true,
            onRebalance: (isAlreadyMember, callback) => { callback(); }
        };

        // initialize the consumer group and flags
        this.consumerGroup = new k.ConsumerGroup(options, [topic]);
        this._highWaterClearing = false;
        this._enabled = true;

        // setup the listener
        this.consumerGroup.on('message', (message) => {
            // push the new message to the container
            this._data.push(JSON.parse(message.value));

            // handle large amount of data
            if (this._data.length >= HIGH_WATER) {
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
            if (this._data.length <= LOW_WATER) {
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