// configurations
const config = require('@config/config');

module.exports = {
    "general": {
        "heartbeat": 2000,
        "pass_binary_messages": true
    },
    "spouts": [
        {
            "name": "material-partial-input",
            "type": "inproc",
            "working_dir": "./spouts",
            "cmd": "kafka-spout.js",
            "init": {
                "kafka_host": config.kafka.host,
                "topic": "STORING.MATERIAL.PARTIAL",
                "groupId": "materialPartialGroup"
            }
        }
    ],
    "bolts": [
        /****************************************
         * Storing OER materials into database
         */

        {
            "name": "postgresql-storage-material-partial",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "postgresql-storage-material-partial.js",
            "inputs": [{
                "source": "material-partial-input",
            }],
            "init": {
                "pg": config.pg
            }
        }

    ],
    "variables": {}
};