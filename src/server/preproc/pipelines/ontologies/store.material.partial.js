// configurations
const config = require('@config/config');

module.exports = {
    "general": {
        "heartbeat": 2000,
        "pass_binary_messages": true
    },
    "spouts": [
        {
            "name": "kafka.material.partial",
            "type": "inproc",
            "working_dir": "./spouts",
            "cmd": "kafka-spout.js",
            "init": {
                "kafka_host": config.kafka.host,
                "topic": "STORING.MATERIAL.PARTIAL",
                "groupId": `${config.kafka.groupId}.MATERIAL.PARTIAL`
            }
        }
    ],
    "bolts": [
        /****************************************
         * Storing OER materials into database
         */

        {
            "name": "store.pg.material.partial",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "store.pg.material.partial.js",
            "inputs": [{
                "source": "kafka.material.partial",
            }],
            "init": {
                "pg": config.pg
            }
        }

    ],
    "variables": {}
};