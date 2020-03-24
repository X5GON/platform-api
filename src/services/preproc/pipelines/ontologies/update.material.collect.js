// global configuration
const config = require("@config/config");

const productionMode = config.isProduction;

// topology definition
module.exports = {
    general: {
        heartbeat: 2000,
        pass_binary_messages: true
    },
    spouts: [
        {
            name: "input.postgres.materials",
            type: "inproc",
            working_dir: "./spouts",
            cmd: "postgres-spout.js",
            init: {
                pg: config.pg,
                sql_statement: `
          WITH URLS AS (
            SELECT
              COALESCE(m.material_id, c.material_id) AS material_id,
              COALESCE(m.provider_id, c.provider_id) AS provider_id,
              m.url AS material_url,
              c.url AS container_url,
              (SELECT COUNT(*) FROM user_activities AS ua WHERE ua.url_id = c.id) as u_count
            FROM contains
            LEFT JOIN urls m ON contains.contains_id = m.id
            LEFT JOIN urls c ON contains.container_id = c.id
            ORDER BY material_id
          ),

          OERS AS (
            SELECT
              URLS.material_id,
              oer.title,
              oer.description,
              oer.creation_date,
              oer.retrieved_date,
              oer.type,
              oer.mimetype,
              URLS.material_url,
              URLS.container_url AS provider_uri,
              URLS.u_count,
              oer.language,
              oer.license

            FROM URLS
            LEFT JOIN oer_materials oer ON URLS.material_id = oer.id
            LEFT JOIN providers     p   ON URLS.provider_id = p.id
          ),

          CONTENT AS (
            SELECT
              material_id,
              array_agg(last_updated) AS lu
            FROM material_contents
            GROUP BY material_id
          )

          SELECT *
          FROM OERS
          WHERE material_id IN (
            SELECT
              material_id
            FROM CONTENT
            WHERE array_position(lu, NULL) IS NOT NULL
          )
          AND material_id NOT IN (SELECT material_id FROM material_update_queue)
          ORDER BY u_count DESC
          LIMIT 100;
        `, // TODO: add the SQL statement for checking if the material is already in the queue
                // repeat every one day
                time_interval: 12 * 60 * 60 * 1000
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
                            source: "input.postgres.materials"
                        }
                    ],
                    init: {
                        pg: config.pg,
                        postgres_table: "material_update_queue",
                        postgres_primary_id: "material_id",
                        message_primary_id: "material_id",
                        postgres_method: "upsert",
                        postgres_time_attrs: {
                            start_process_time: true
                        },
                        postgres_literal_attrs: {
                            status: "in queue"
                        },
                        document_error_path: "message"
                    }
                }
            ]
            : []),
        {
            name: "update.material.transform",
            working_dir: ".",
            type: "sys",
            cmd: "transform",
            inputs: [
                {
                    source: productionMode
                        ? "log.material.process.started"
                        : "input.postgres.materials"
                }
            ],
            init: {
                output_template: {
                    material_id: "material_id",
                    title: "title",
                    description: "description",
                    provider_uri: "provider_uri",
                    material_url: "material_url",
                    language: "language",
                    creation_date: "creation_date",
                    retrieved_date: "retrieved_date",
                    type: "type",
                    mimetype: "mimetype",
                    license: "license",
                    material_metadata: {
                        metadata: "material_metadata.metadata",
                        raw_text: "material_metadata.raw_text",
                        wikipedia_concepts: {}
                    }
                }
            }
        },
        {
            name: "update.material.redirect",
            type: "inproc",
            working_dir: "./bolts",
            cmd: "update-material-redirect.js",
            inputs: [{ source: "update.material.transform" }],
            init: {}
        },

        // LOGGING STATE OF MATERIAL PROCESS
        ...(productionMode
            ? [
                {
                    name: "log.material.process.finished",
                    type: "inproc",
                    working_dir: "./bolts",
                    cmd: "log-message-postgresql.js",
                    inputs: [
                        {
                            source: "update.material.redirect",
                            stream_id: "updated"
                        }
                    ],
                    init: {
                        pg: config.pg,
                        postgres_table: "material_update_queue",
                        postgres_primary_id: "material_id",
                        message_primary_id: "material_id",
                        postgres_method: "update",
                        postgres_time_attrs: {
                            end_process_time: true
                        },
                        postgres_literal_attrs: {
                            status: "material updated"
                        },
                        document_error_path: "message",
                        final_bolt: true
                    }
                }
            ]
            : []),

        {
            name: "kafka.material.update.text",
            type: "inproc",
            working_dir: "./bolts",
            cmd: "kafka-message-forward.js",
            inputs: [
                {
                    source: "update.material.redirect",
                    stream_id: "text"
                }
            ],
            init: {
                kafka_host: config.kafka.host,
                kafka_topic: "UPDATE_MATERIAL_TEXT"
            }
        },
        {
            name: "kafka.material.update.video",
            type: "inproc",
            working_dir: "./bolts",
            cmd: "kafka-message-forward.js",
            inputs: [
                {
                    source: "update.material.redirect",
                    stream_id: "video"
                }
            ],
            init: {
                kafka_host: config.kafka.host,
                kafka_topic: "UPDATE_MATERIAL_VIDEO"
            }
        }
    ],
    variables: {}
};
