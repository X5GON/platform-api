// configurations
const config = require('@config/config');

module.exports = {
    "general": {
        "heartbeat": 2000,
        "pass_binary_messages": true
    },
    "spouts": [
        {
            "name": "recsys-user-transitions",
            "type": "inproc",
            "working_dir": "./spouts",
            "cmd": "kafka-spout.js",
            "init": {
                "kafka_host": config.kafka.host,
                "topic": "STORING.RECSYS.TRANSITIONS",
                "groupId": config.kafka.groupId
            }
        }
    ],
    "bolts": [
        {
            "name": "postgresql-storage-recsys-transitions",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "postgresql-storage-recsys-transitions.js",
            "inputs": [{
                "source": "recsys-user-transitions",
            }],
            "init": {
                "pg": config.pg
            }
        }

    ],
    "variables": {}
};