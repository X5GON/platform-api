// configurations
const config = require('@config/config');

module.exports = {
    "general": {
        "heartbeat": 2000,
        "pass_binary_messages": true
    },
    "spouts": [
        {
            "name": "kafka.material.update",
            "type": "inproc",
            "working_dir": "./spouts",
            "cmd": "kafka-spout.js",
            "init": {
                "kafka_host": config.kafka.host,
                "topic": "UPDATE.MATERIAL.CONTENT",
                "groupId": `${config.kafka.groupId}`
            }
        }
    ],
    "bolts": [
        /****************************************
         * Storing OER materials into database
         */

        {
            "name": "store.pg.material.update",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "store.pg.material.update.js",
            "inputs": [{
                "source": "kafka.material.update",
            }],
            "init": {
                "pg": config.pg,
                "production_mode": config.environment === 'prod'
            }
        }

    ],
    "variables": {}
};