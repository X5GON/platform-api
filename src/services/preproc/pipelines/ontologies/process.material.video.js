// global configuration
const config = require("@config/config");

const productionMode = config.environment === "prod";

// topology definition
module.exports = {
    general: {
        heartbeat: 2000,
        pass_binary_messages: true
    },
    spouts: [
        {
            name: "input.kafka.video",
            type: "inproc",
            working_dir: "./spouts",
            cmd: "kafka-spout.js",
            init: {
                kafka_host: config.kafka.host,
                topic: "PREPROC_MATERIAL_VIDEO",
                group_id: config.kafka.groupId,
                high_water: 1,
                low_water: 0,
                from_offset: "latest"
            }
        }
    ],
    bolts: [
    // LOGGING STATE OF MATERIAL PROCESS
        ...(productionMode
            ? [
                {
                    name: "log.material.process.started",
                    type: "inproc",
                    working_dir: "./bolts",
                    cmd: "log-message-postgresql.js",
                    inputs: [
                        {
                            source: "input.kafka.video"
                        }
                    ],
                    init: {
                        pg: config.pg,
                        postgres_table: "material_process_queue",
                        postgres_primary_id: "material_url",
                        message_primary_id: "material_url",
                        postgres_method: "update",
                        postgres_time_attrs: {
                            start_process_time: true
                        },
                        postgres_literal_attrs: {
                            status: "[VIDEO] material processing started: 0/4 steps completed. Transforming format"
                        },
                        document_error_path: "message"
                    }
                }
            ]
            : []),

        {
            name: "transform.material",
            working_dir: ".",
            type: "sys",
            cmd: "transform",
            inputs: [
                {
                    source: productionMode
                        ? "log.material.process.started"
                        : "input.kafka.video"
                }
            ],
            init: {
                output_template: {
                    title: "title",
                    description: "description",
                    provider_uri: "provider_uri",
                    material_url: "material_url",
                    authors: "author",
                    language: "language",
                    type: "type.ext",
                    mimetype: "type.mime",
                    creation_date: "date_created",
                    retrieved_date: "retrieved_date",
                    provider: { token: "provider_token" },
                    license: "license",
                    material_metadata: {
                        metadata: "material_metadata.metadata",
                        raw_text: "material_metadata.raw_text",
                        wikipedia_concepts: {}
                    }
                }
            }
        },

        // LOGGING STATE OF MATERIAL PROCESS
        ...(productionMode
            ? [
                {
                    name: "log.material.process.formatting",
                    type: "inproc",
                    working_dir: "./bolts",
                    cmd: "log-message-postgresql.js",
                    inputs: [
                        {
                            source: "transform.material"
                        }
                    ],
                    init: {
                        pg: config.pg,
                        postgres_table: "material_process_queue",
                        postgres_primary_id: "material_url",
                        message_primary_id: "material_url",
                        postgres_method: "update",
                        postgres_literal_attrs: {
                            status:
                  "[VIDEO] material object schema transformed: 1/4 steps completed. Retrieving transcriptions and translations"
                        },
                        document_error_path: "message"
                    }
                }
            ]
            : []),

        {
            name: "extract.video.ttp",
            type: "inproc",
            working_dir: "./bolts",
            cmd: "extract-video-ttp.js",
            inputs: [
                {
                    source: productionMode
                        ? "log.material.process.formatting"
                        : "transform.material"
                }
            ],
            init: {
                ttp: {
                    user: config.preproc.ttp.user,
                    token: config.preproc.ttp.token
                },
                document_language_path: "language",
                document_location_path: "material_url",
                document_authors_path: "authors",
                document_title_path: "title",
                document_text_path: "material_metadata.raw_text",
                document_transcriptions_path: "material_metadata.transcriptions",
                ttp_id_path: "material_metadata.ttp_id"
            }
        },

        // LOGGING STATE OF MATERIAL PROCESS
        ...(productionMode
            ? [
                {
                    name: "log.material.process.extract.video.ttp",
                    type: "inproc",
                    working_dir: "./bolts",
                    cmd: "log-message-postgresql.js",
                    inputs: [
                        {
                            source: "extract.video.ttp"
                        }
                    ],
                    init: {
                        pg: config.pg,
                        postgres_table: "material_process_queue",
                        postgres_primary_id: "material_url",
                        message_primary_id: "material_url",
                        postgres_method: "update",
                        postgres_literal_attrs: {
                            status:
                  "[VIDEO] material transcriptions and translations retrieved: 2/4 steps completed. Retrieving wikipedia concepts"
                        },
                        document_error_path: "message"
                    }
                }
            ]
            : []),

        {
            name: "extract.wikipedia",
            type: "inproc",
            working_dir: "./bolts",
            cmd: "extract-wikipedia.js",
            inputs: [
                {
                    source: productionMode
                        ? "log.material.process.extract.video.ttp"
                        : "extract.video.ttp"
                }
            ],
            init: {
                wikifier: {
                    user_key: config.preproc.wikifier.userKey,
                    wikifier_url: config.preproc.wikifier.wikifierUrl,
                    max_length: 10000
                },
                document_text_path: "material_metadata.raw_text",
                wikipedia_concept_path: "material_metadata.wikipedia_concepts",
                document_error_path: "message"
            }
        },

        // LOGGING STATE OF MATERIAL PROCESS
        ...(productionMode
            ? [
                {
                    name: "log.material.process.extract.wikipedia",
                    type: "inproc",
                    working_dir: "./bolts",
                    cmd: "log-message-postgresql.js",
                    inputs: [
                        {
                            source: "extract.wikipedia"
                        }
                    ],
                    init: {
                        pg: config.pg,
                        postgres_table: "material_process_queue",
                        postgres_primary_id: "material_url",
                        message_primary_id: "material_url",
                        postgres_method: "update",
                        postgres_literal_attrs: {
                            status: "[VIDEO] material wikified: 3/4 steps completed. Validating material"
                        },
                        document_error_path: "message"
                    }
                }
            ]
            : []),

        {
            name: "message.validate",
            type: "inproc",
            working_dir: "./bolts",
            cmd: "message-validate.js",
            inputs: [
                {
                    source: productionMode
                        ? "log.material.process.extract.wikipedia"
                        : "extract.wikipedia"
                }
            ],
            init: {
                json_schema: require("../schemas/material"),
                document_error_path: "message"
            }
        },

        // LOGGING STATE OF MATERIAL PROCESS
        ...(productionMode
            ? [
                {
                    name: "log.material.process.message.validate",
                    type: "inproc",
                    working_dir: "./bolts",
                    cmd: "log-message-postgresql.js",
                    inputs: [
                        {
                            source: "message.validate"
                        }
                    ],
                    init: {
                        pg: config.pg,
                        postgres_table: "material_process_queue",
                        postgres_primary_id: "material_url",
                        message_primary_id: "material_url",
                        postgres_method: "update",
                        postgres_literal_attrs: {
                            status: "[VIDEO] material validated: 4/4 steps completed. Storing the material"
                        },
                        document_error_path: "message"
                    }
                }
            ]
            : []),

        /** **************************************
     * Send the completely processed materials
     * to kafka distribution
     */

        {
            name: "kafka.material.complete",
            type: "inproc",
            working_dir: "./bolts",
            cmd: "kafka-material-complete.js",
            inputs: [
                {
                    source: productionMode
                        ? "log.material.process.message.validate"
                        : "message.validate"
                }
            ],
            init: {
                kafka_host: config.kafka.host,
                kafka_topic: "STORE_MATERIAL_COMPLETE"
            }
        },

        /** **************************************
     * Send the partially processed materials
     * to kafka distribution
     */

        {
            name: "transform.material.partial",
            working_dir: ".",
            type: "sys",
            cmd: "transform",
            inputs: [
                ...(productionMode
                    ? [
                        {
                            source: "log.material.process.started",
                            stream_id: "stream_error"
                        }
                    ]
                    : []),
                ...(productionMode
                    ? [
                        {
                            source: "log.material.process.formatting",
                            stream_id: "stream_error"
                        }
                    ]
                    : []),
                {
                    source: "extract.video.ttp",
                    stream_id: "stream_error"
                },
                ...(productionMode
                    ? [
                        {
                            source: "log.material.process.extract.video.ttp",
                            stream_id: "stream_error"
                        }
                    ]
                    : []),
                {
                    source: "extract.wikipedia",
                    stream_id: "stream_error"
                },
                ...(productionMode
                    ? [
                        {
                            source: "log.material.process.extract.wikipedia",
                            stream_id: "stream_error"
                        }
                    ]
                    : []),
                {
                    source: "message.validate",
                    stream_id: "stream_error"
                }
            ],
            init: {
                output_template: {
                    title: "title",
                    description: "description",
                    provideruri: "provider_uri",
                    materialurl: "material_url",
                    author: "authors",
                    language: "language",
                    type: {
                        ext: "type",
                        mime: "mimetype"
                    },
                    datecreated: "creation_date",
                    dateretrieved: "retrieved_date",
                    providertoken: "provider.token",
                    license: "license",
                    materialmetadata: "material_metadata",
                    message: "message"
                }
            }
        },

        // LOGGING STATE OF MATERIAL PROCESS
        ...(productionMode
            ? [
                {
                    name: "log.material.process.error",
                    type: "inproc",
                    working_dir: "./bolts",
                    cmd: "log-message-postgresql.js",
                    inputs: [
                        {
                            source: "transform.material.partial",
                            stream_id: "stream_error"
                        }
                    ],
                    init: {
                        pg: config.pg,
                        postgres_table: "material_process_queue",
                        postgres_primary_id: "material_url",
                        message_primary_id: "materialurl",
                        postgres_method: "update",
                        postgres_message_attrs: {
                            status: "message"
                        },
                        document_error_path: "message"
                    }
                }
            ]
            : []),

        {
            name: "kafka.material.partial",
            type: "inproc",
            working_dir: "./bolts",
            cmd: "kafka-material-partial.js",
            inputs: [
                {
                    source: productionMode
                        ? "log.material.process.error"
                        : "transform.material.partial",
                    stream_id: "stream_error"
                }
            ],
            init: {
                kafka_host: config.kafka.host,
                kafka_topic: "STORE_MATERIAL_PARTIAL"
            }
        }
    ],
    variables: {}
};
