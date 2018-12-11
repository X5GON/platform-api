// configurations
const config = require('../../../config/config');

module.exports = {
    "general": {
        "heartbeat": 2000,
        "pass_binary_messages": true
    },
    "spouts": [
        {
            "name": "text-input",
            "type": "inproc",
            "working_dir": "./spouts",
            "cmd": "kafka-spout.js",
            "init": {
                "kafka_host": config.kafka.host,
                "topic": "text-topic"
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
                "source": "text-input"
            }],
            "init": {}
        },
        {
            "name": "text-content-extraction",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "extraction-text.js",
            "inputs": [{
                "source": "material-format",
            }],
            "init": {}
        },
        {
            "name": "wikification",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "extraction-wikipedia.js",
            "inputs": [{
                "source": "text-content-extraction",
            }],
            "init": {
                "userKey": config.preproc.wikifier.userKey,
                "wikifierUrl": config.preproc.wikifier.wikifierUrl,
            }
        },
        {
            "name": "material-validation",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "material-validator.js",
            "inputs": [{
                "source": "wikification",
            }],
            "init": {}
        },

        /****************************************
         * Storing OER materials into the
         * production and development tables
         */

        {
            "name": "postgresql-storage-production",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "postgresql-storage.js",
            "inputs": [{
                "source": "material-validation",
            }],
            "init": {
                "postgres_table": "oer_materials",
                "pg": config.pg
            }
        },
        {
            "name": "postgresql-storage-development",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "postgresql-storage.js",
            "inputs": [{
                "source": "material-validation",
            }],
            "init": {
                "postgres_table": "oer_materials_dev",
                "pg": config.pg
            }
        },

        /****************************************
         * Storing partial OER materials
         */

        {
            "name": "postgresql-storage-partial",
            "type": "inproc",
            "working_dir": "./bolts",
            "cmd": "postgresql-storage.js",
            "inputs": [{
                "source": "material-format",
                "stream_id": "stream_partial"
            },{
                "source": "text-content-extraction",
                "stream_id": "stream_partial"
            },{
                "source": "wikification",
                "stream_id": "stream_partial"
            },{
                "source": "material-validation",
                "stream_id": "stream_partial"
            }],
            "init": {
                "postgres_table": "oer_materials_partial",
                "pg": config.pg
            }
        },

        /****************************************
         * Storing partial OER materials
         */

        {
            "name": "material-console",
            "working_dir": ".",
            "type": "sys",
            "cmd": "console",
            "inputs": [{
                "source": "material-format"
            },
            {
                "source": "material-validation"
            }],
            "init": {}
        },



    ],
    "variables": {}
};