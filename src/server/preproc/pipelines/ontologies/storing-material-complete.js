// configurations
const config = require('@config/config');

module.exports = {
    "general": {
        "heartbeat": 2000,
        "pass_binary_messages": true
    },
    "spouts": [
        {
            "name": "material-complete-input",
            "type": "inproc",
            "working_dir": "./spouts",
            "cmd": "kafka-spout.js",
            "init": {
                "kafka_host": config.kafka.host,
                "topic": "STORING.MATERIAL.COMPLETE",
                "groupId": "materialCompleteGroup"
            }
        }
    ],
    "bolts": [
        /****************************************
         * Storing OER materials into database
         */

        {
            "name": "postgresql-storage-material-complete",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "postgresql-storage-material-complete.js",
            "inputs": [{
                "source": "material-complete-input",
            }],
            "init": {
                "pg": config.pg
            }
        }

    ],
    "variables": {}
};