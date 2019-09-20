// configurations
const config = require('@config/config');

module.exports = {
    "general": {
        "heartbeat": 2000,
        "pass_binary_messages": true
    },
    "spouts": [
        {
            "name": "kafka.user-activities.visits",
            "type": "inproc",
            "working_dir": "./spouts",
            "cmd": "kafka-spout.js",
            "init": {
                "kafka_host": config.kafka.host,
                "topic": "STORING.USERACTIVITY.VISIT",
                "groupId": `${config.kafka.groupId}.USER-ACTIVITIES.VISITS`
            }
        },
        {
            "name": "kafka.user-activities.video",
            "type": "inproc",
            "working_dir": "./spouts",
            "cmd": "kafka-spout.js",
            "init": {
                "kafka_host": config.kafka.host,
                "topic": "STORING.USERACTIVITY.VIDEO",
                "groupId": `${config.kafka.groupId}.USER-ACTIVITIES.VIDEO`
            }
        }
    ],
    "bolts": [
        /****************************************
         * Storing user activity into database
         */
        {
            "name": "store.pg.user-activity.visits",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "store.pg.user-activity.visits.js",
            "inputs": [{
                "source": "kafka.user-activities.visits",
            }],
            "init": {
                "pg": config.pg
            }
        },

        /****************************************
         * Logging user activity
         */
        {
            "name": "log.user-activity.connect",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "log.user-activity.connect.js",
            "inputs": [{
                "source": "kafka.user-activities.visits",
            },{
                "source": "kafka.user-activities.video",
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