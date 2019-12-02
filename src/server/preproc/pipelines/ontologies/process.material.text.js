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
            "name": "input.kafka.text",
            "type": "inproc",
            "working_dir": "./spouts",
            "cmd": "kafka-spout.js",
            "init": {
                "kafka_host": config.kafka.host,
                "topic": "PROCESSING.MATERIAL.TEXT",
                "groupId": `${config.kafka.groupId}.TEXT`
            }
        }
    ],
    "bolts": [
        {
            "name": "transform.material",
            "working_dir": ".",
            "type": "sys",
            "cmd": "transform",
            "inputs": [
                { "source": "input.kafka.text" }
            ],
            "init": {
                "output_template": {
                    "title": "title",
                    "description": "description",
                    "provider_uri": "provider_uri",
                    "material_url": "material_url",
                    "authors": "author",
                    "language": "language",
                    "creation_date": "date_created",
                    "retrieved_date": "retrieved_date",
                    "type": "type.ext",
                    "mimetype": "type.mime",
                    "provider": { "token": "provider_token" },
                    "license": "license",
                    "material_metadata": {
                        "metadata": "material_metadata.metadata",
                        "raw_text": "material_metadata.raw_text",
                        "wikipedia_concepts": {}
                    }
                }
            }
        },
        {
            "name": "extract.text.raw",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "extract.text.raw.js",
            "inputs": [{
                "source": "transform.material",
            }],
            "init": {
                "text_config": {
                    "preserveLineBreaks": true,
                    "includeAltText": true
                },
                "pg": config.pg,
                "production_mode": config.environment === 'prod'
            }
        },
        {
            "name": "extract.text.ttp",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "extract.text.ttp.js",
            "inputs": [{
                "source": "extract.text.raw",
            }],
            "init": {
                "user": config.preproc.ttp.user,
                "token": config.preproc.ttp.token,
                "tmp_folder": './tmp',
                "pg": config.pg,
                "production_mode": config.environment === 'prod'
            }
        },
        {
            "name": "extract.wikipedia",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "extract.wikipedia.js",
            "inputs": [{
                "source": "extract.text.ttp",
            }],
            "init": {
                "userKey": config.preproc.wikifier.userKey,
                "wikifierUrl": config.preproc.wikifier.wikifierUrl,
                "pg": config.pg,
                "production_mode": config.environment === 'prod'
            }
        },
        {
            "name": "validator",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "validator.js",
            "inputs": [{
                "source": "extract.wikipedia",
            }],
            "init": {
                "pg": config.pg,
                "production_mode": config.environment === 'prod'
            }
        },

        /****************************************
         * Send the completely processed materials
         * to kafka distribution
         */

        {
            "name": "kafka.material.complete",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "kafka.material.complete.js",
            "inputs": [{
                "source": "validator",
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
            "name": "transform.material.partial",
            "working_dir": ".",
            "type": "sys",
            "cmd": "transform",
            "inputs": [{
                "source": "extract.text.raw",
                "stream_id": "incomplete"
            },{
                "source": "extract.wikipedia",
                "stream_id": "incomplete"
            },{
                "source": "validator",
                "stream_id": "incomplete"
            }],
            "init": {
                "output_template": {
                    "title": "title",
                    "description": "description",
                    "provideruri": "provider_uri",
                    "materialurl": "material_url",
                    "author": "authors",
                    "language": "language",
                    "type": {
                        "ext": "type",
                        "mime": "mimetype"
                    },
                    "datecreated": "creation_date",
                    "dateretrieved": "retrieved_date",
                    "providertoken": "provider.token",
                    "license": "license",
                    "materialmetadata": "material_metadata"
                }
            }
        },
        {
            "name": "kafka.material.partial",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "kafka.material.partial.js",
            "inputs": [
                { "source": "transform.material.partial" }
            ],
            "init": {
                "kafka_host": config.kafka.host,
                "kafka_topic": "STORING.MATERIAL.PARTIAL"
            }
        }
    ],
    "variables": {}
};