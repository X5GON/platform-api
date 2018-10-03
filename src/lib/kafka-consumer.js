// external modules
const k = require("kafka-node");

const HIGH_WATER = 100;
const LOW_WATER = 10;

/**
 * Kafka consumer class.
 */
class KafkaConsumer {

    /**
     * @description Initialize the Kafka consumer instance.
     * @param {String} host - The host address of the kafka service.
     * @param {String} topic - The topic kafka consumer is listening to.
     */
    constructor(host, topic) {
        this._data = [];

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

        this.consumer_group = new k.ConsumerGroup(options, [topic]);
        this._high_water_clearing = false;
        this._enabled = true;

        this.consumer_group.on('message', (message) => {
            this._data.push(JSON.parse(message.value));
            if (this._data.length >= HIGH_WATER) {
                this._high_water_clearing = true;
                this.consumer_group.pause();
            }
        });
    }

    enable() {
        if (!this._enabled) {
            if (!this._high_water_clearing) {
                this.consumer_group.resume();
            }
            this._enabled = true;
        }
    }

    disable() {
        if (this._enabled) {
            if (!this._high_water_clearing) {
                this.consumer_group.pause();
            }
            this._enabled = false;
        }
    }

    next() {
        if (!this._enabled) {
            return null;
        }
        if (this._data.length > 0) {
            let msg = this._data[0];
            this._data = this._data.slice(1);
            if (this._data.length <= LOW_WATER) {
                this._high_water_clearing = false;
                this.consumer_group.resume();
            }
            return msg;
        } else {
            return null;
        }
    }

    stop(cb) {
        this.consumer_group.close(true, cb);
    }
}

module.exports = KafkaConsumer;