// configurations
const config = require('@config/config');

module.exports = {
    "general": {
        "heartbeat": 2000,
        "pass_binary_messages": true
    },
    "spouts": [
        {
            "name": "recsys-user-selections",
            "type": "inproc",
            "working_dir": "./spouts",
            "cmd": "kafka-spout.js",
            "init": {
                "kafka_host": config.kafka.host,
                "topic": "STORING.RECSYS.SELECTIONS",
                "groupId": config.kafka.groupId
            }
        }
    ],
    "bolts": [
        {
            "name": "postgresql-storage-recsys-selections",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "postgresql-storage-recsys-selections.js",
            "inputs": [{
                "source": "recsys-user-selections",
            }],
            "init": {
                "pg": config.pg
            }
        }

    ],
    "variables": {}
};