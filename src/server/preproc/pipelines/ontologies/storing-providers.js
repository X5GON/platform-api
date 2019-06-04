// configurations
const config = require('alias:config/config');

module.exports = {
    "general": {
        "heartbeat": 2000,
        "pass_binary_messages": true
    },
    "spouts": [
        {
            "name": "providers-input",
            "type": "inproc",
            "working_dir": "./spouts",
            "cmd": "kafka-spout.js",
            "init": {
                "kafka_host": config.kafka.host,
                "topic": "STORING.PROVIDERS",
                "groupId": `${config.kafka.groupId}-providers`
            }
        }
    ],
    "bolts": [
        /****************************************
         * Storing user activity into database
         */
        {
            "name": "postgresql-storage-providers",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "postgresql-storage-providers.js",
            "inputs": [{
                "source": "providers-input",
            }],
            "init": {
                "pg": config.pg
            }
        }
    ],
    "variables": {}
};