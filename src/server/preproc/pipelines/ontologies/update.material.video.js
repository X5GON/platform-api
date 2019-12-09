// global configuration
const config = require('@config/config');

// topology definition
module.exports = {
    "general": {
        "heartbeat": 2000,
        "pass_binary_messages": true
    },
    "spouts": [
        {
            "name": "input.kafka.video",
            "type": "inproc",
            "working_dir": "./spouts",
            "cmd": "kafka-spout.js",
            "init": {
                "kafka_host": config.kafka.host,
                "topic": "UPDATE.MATERIAL.VIDEO",
                "groupId": config.kafka.groupId
            }
        }
    ],
    "bolts": [
        {
            "name": "extract.video.ttp",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "extract.video.ttp.js",
            "inputs": [{
                "source": "input.kafka.video"
            }],
            "init": {
                "user": config.preproc.ttp.user,
                "token": config.preproc.ttp.token,
                "pg": config.pg,
                "production_mode": config.environment === 'prod'
            }
        },

        /****************************************
         * Send the completely processed materials
         * to kafka distribution
         */

        {
            "name": "kafka.material.content",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "kafka.forward.js",
            "inputs": [{
                "source": "extract.video.ttp",
            }],
            "init": {
                "kafka_host": config.kafka.host,
                "kafka_topic": "UPDATE.MATERIAL.CONTENT"
            }
        },

        /****************************************
         * Send the partially processed materials
         * to kafka distribution
         */

        // {
        //     "name": "transform.material.partial",
        //     "working_dir": ".",
        //     "type": "sys",
        //     "cmd": "transform",
        //     "inputs": [{
        //         "source": "extract.video.ttp",
        //         "stream_id": "incomplete"
        //     },{
        //         "source": "extract.wikipedia",
        //         "stream_id": "incomplete"
        //     },{
        //         "source": "validator",
        //         "stream_id": "incomplete"
        //     }],
        //     "init": {
        //         "output_template": {
        //             "title": "title",
        //             "description": "description",
        //             "provideruri": "provider_uri",
        //             "materialurl": "material_url",
        //             "author": "authors",
        //             "language": "language",
        //             "type": {
        //                 "ext": "type",
        //                 "mime": "mimetype"
        //             },
        //             "datecreated": "creation_date",
        //             "dateretrieved": "retrieved_date",
        //             "providertoken": "provider.token",
        //             "license": "license",
        //             "materialmetadata": "material_metadata"
        //         }
        //     }
        // },
        // {
        //     "name": "kafka.material.partial",
        //     "type": "inproc",
        //     "working_dir": "./bolts",
        //     "cmd": "kafka.material.partial.js",
        //     "inputs": [
        //         { "source": "transform.material.partial" }
        //     ],
        //     "init": {
        //         "kafka_host": config.kafka.host,
        //         "kafka_topic": "STORING.MATERIAL.PARTIAL"
        //     }
        // }
    ],
    "variables": {}
};