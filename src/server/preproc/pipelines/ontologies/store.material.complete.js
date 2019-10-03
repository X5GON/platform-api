// configurations
const config = require('@config/config');

module.exports = {
    "general": {
        "heartbeat": 2000,
        "pass_binary_messages": true
    },
    "spouts": [
        {
            "name": "kafka.material.complete",
            "type": "inproc",
            "working_dir": "./spouts",
            "cmd": "kafka-spout.js",
            "init": {
                "kafka_host": config.kafka.host,
                "topic": "STORING.MATERIAL.COMPLETE",
                "groupId": `${config.kafka.groupId}.MATERIAL.COMPLETE`
            }
        }
    ],
    "bolts": [
        /****************************************
         * Storing OER materials into database
         */

        {
            "name": "store.pg.material.complete",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "store.pg.material.complete.js",
            "inputs": [{
                "source": "kafka.material.complete",
            }],
            "init": {
                "pg": config.pg,
                "production_mode": config.environment === 'prod'
            }
        }

    ],
    "variables": {}
};