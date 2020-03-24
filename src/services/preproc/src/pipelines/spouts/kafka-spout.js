/** **********************************************
 * Kafka Consumer Spout
 * This component is listening to a Kafka topic
 * and then sends the message forward to the next
 * component in the topology.
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
    constructor({
        host, topic, group_id: groupId, high_water: HIGH_WATER, low_water: LOW_WATER, from_offset: FROM_OFFSET
    }) {
        // the message container
        this._data = [];
        // set the data limits
        this.HIGH_WATER = HIGH_WATER;
        this.LOW_WATER = LOW_WATER;
        const fromOffset = FROM_OFFSET || "latest";

        // setup the consumer options
        const options = {
            kafkaHost: host,
            ssl: true,
            groupId,
            sessionTimeout: 15000,
            protocol: ["roundrobin"],
            fromOffset,
            fetchMaxBytes: 10000000, // 10 MB - negates "Error: Not a message set. Magic byte is 2"
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


/**
 * @class KafkaSpout
 * @description Retrieves the messages provided by a Kafka topic and forwards it
 * to the next component of the topology.
 */
class KafkaSpout {
    constructor() {
        this._name = null;
        this._context = null;
        this._prefix = "";
        this._generator = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._prefix = `[KafkaSpout ${this._name}]`;
        this._generator = new KafkaConsumer({
            host: config.kafka_host,
            topic: config.topic,
            group_id: config.group_id,
            high_water: config.high_water,
            low_water: config.low_water,
            from_offset: config.from_offset
        });
        callback();
    }

    heartbeat() {
    }

    shutdown(callback) {
        this._generator.stop(callback);
    }

    run() {
        this._generator.enable();
    }

    pause() {
        this._generator.disable();
    }

    next(callback) {
        let message = this._generator.next();
        callback(null, message, null, callback);
    }
}

exports.create = function () {
    return new KafkaSpout();
};
