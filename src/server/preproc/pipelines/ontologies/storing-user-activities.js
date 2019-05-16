// configurations
const config = require('alias:config/config');

module.exports = {
    "general": {
        "heartbeat": 2000,
        "pass_binary_messages": true
    },
    "spouts": [
        {
            "name": "user-activity-visit-input",
            "type": "inproc",
            "working_dir": "./spouts",
            "cmd": "kafka-spout.js",
            "init": {
                "kafka_host": config.kafka.host,
                "topic": "STORING.USERACTIVITY.VISIT",
                "groupId": config.kafka.groupId
            }
        },
        {
            "name": "user-activity-video-input",
            "type": "inproc",
            "working_dir": "./spouts",
            "cmd": "kafka-spout.js",
            "init": {
                "kafka_host": config.kafka.host,
                "topic": "STORING.USERACTIVITY.VIDEO",
                "groupId": config.kafka.groupId
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
                "source": "user-activity-visit-input",
            }],
            "init": {
                "pg": config.pg
            }
        },

        /****************************************
         * Logging user activity
         */
        {
            "name": "logger-user-activity-connect",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "logger-user-activity-connect.js",
            "inputs": [{
                "source": "user-activity-visit-input",
            },{
                "source": "user-activity-video-input",
            }],
            "init": {
                file_name: 'user-activities',
                level: 'info',
                sub_folder: 'user-activities'
            }
        }

    ],
    "variables": {}
};