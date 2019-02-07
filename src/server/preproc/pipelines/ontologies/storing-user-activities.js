// configurations
const config = require('../../../../config/config');

module.exports = {
    "general": {
        "heartbeat": 2000,
        "pass_binary_messages": true
    },
    "spouts": [
        {
            "name": "user-activity-connect-input",
            "type": "inproc",
            "working_dir": "./spouts",
            "cmd": "kafka-spout.js",
            "init": {
                "kafka_host": config.kafka.host,
                "topic": "STORING.USERACTIVITY.CONNECT",
                "groupId": "userActivityGroup"
            }
        }
    ],
    "bolts": [
        /****************************************
         * Storing user activity into database
         */

        {
            "name": "postgresql-storage-user-activity-connect",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "postgresql-storage-user-activity-connect.js",
            "inputs": [{
                "source": "user-activity-connect-input",
            }],
            "init": {
                "pg": config.pg
            }
        }

    ],
    "variables": {}
};