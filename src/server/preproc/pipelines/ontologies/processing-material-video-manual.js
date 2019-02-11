// configurations
const config = require('@config/config');

module.exports = {
    "general": {
        "heartbeat": 2000,
        "pass_binary_messages": true
    },
    "spouts": [
        {
            "name": "video-input",
            "type": "inproc",
            "working_dir": "./spouts",
            "cmd": "kafka-spout.js",
            "init": {
                "kafka_host": config.kafka.host,
                "topic": "PROCESSING.MATERIAL.VIDEO",
                "groupId": "videoGroup"
            }
        }
    ],
    "bolts": [
        {
            "name": "material-format",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "material-format.js",
            "inputs": [{
                "source": "video-input"
            }],
            "init": {
                "fields": [
                    { "name": "title" },
                    { "name": "description" },
                    { "name": "provideruri" },
                    { "name": "materialurl" },
                    { "name": "author" },
                    { "name": "language" },
                    { "name": "type" },
                    { "name": "datecreated" },
                    { "name": "dateretrieved" },
                    { "name": "materialmetadata", "default": {} },
                    { "name": "license" }
                ]
            }
        },
        {
            "name": "material-type",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "material-type.js",
            "inputs": [{
                "source": "material-format",
            }],
            "init": {}
        },
        {
            "name": "video-dfxp-extraction",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "extraction-dfxp.js",
            "inputs": [{
                "source": "material-type",
            }],
            "init": {
                "dfxp_folder": "../../../../data/videolectures/data"
            }
        },
        {
            "name": "wikification",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "extraction-wikipedia.js",
            "inputs": [{
                "source": "video-dfxp-extraction"
            }],
            "init": {
                "userKey": config.preproc.wikifier.userKey,
                "wikifierUrl": config.preproc.wikifier.wikifierUrl
            }
        },
        {
            "name": "material-validator",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "material-validator.js",
            "inputs": [{
                "source": "wikification"
            }],
            "init": {}
        },

        /****************************************
         * Send the completely processed materials
         * to kafka distribution
         */

        {
            "name": "kafka-material-complete-topic",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "kafka-material-complete.js",
            "inputs": [{
                "source": "material-validator",
            }],
            "init": {
                "kafka_host": config.kafka.host,
                "kafka_topic": "STORING.MATERIAL.COMPLETE"
            }
        },

        /****************************************
         * Send the partially processed materials
         * to kafka distribution
         */

        {
            "name": "kafka-material-partial-topic",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "kafka-material-partial.js",
            "inputs": [{
                "source": "material-format",
                "stream_id": "stream_partial"
            },{
                "source": "video-dfxp-extraction",
                "stream_id": "stream_partial"
            },{
                "source": "wikification",
                "stream_id": "stream_partial"
            },{
                "source": "material-validator",
                "stream_id": "stream_partial"
            }],
            "init": {
                "kafka_host": config.kafka.host,
                "kafka_topic": "STORING.MATERIAL.PARTIAL"
            }
        }
    ],
    "variables": {}
};