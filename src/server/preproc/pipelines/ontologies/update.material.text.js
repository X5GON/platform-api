// global configuration
const config = require('@config/config');

const productionMode = config.environment === 'prod';

// topology definition
module.exports = {
  general: {
    heartbeat: 2000,
    pass_binary_messages: true
  },
  spouts: [
    {
      name: 'input.kafka.text',
      type: 'inproc',
      working_dir: './spouts',
      cmd: 'kafka-spout.js',
      init: {
        kafka_host: config.kafka.host,
        topic: 'UPDATE.MATERIAL.TEXT',
        groupId: config.kafka.groupId
      }
    }
  ],
  bolts: [
    // LOGGING STATE OF MATERIAL PROCESS
    ...(productionMode
      ? [
          {
            name: 'log.material.update.started',
            type: 'inproc',
            working_dir: './bolts',
            cmd: 'log-message-postgresql.js',
            inputs: [
              {
                source: 'input.kafka.text'
              }
            ],
            init: {
              pg: config.pg,
              postgres_table: 'material_update_queue',
              postgres_primary_id: 'material_id',
              message_primary_id: 'material_id',
              postgres_method: 'update',
              postgres_time_attrs: {
                start_process_time: true
              },
              postgres_literal_attrs: {
                status: 'material update started: 0/4 steps completed'
              },
              document_error_path: 'message'
            }
          }
        ]
      : []),

    {
      name: 'get.material.content',
      type: 'inproc',
      working_dir: './bolts',
      cmd: 'get-material-content.js',
      inputs: [
        {
          source: productionMode
            ? 'log.material.update.started'
            : 'input.kafka.text'
        }
      ],
      init: {
        pg: config.pg
      }
    },

    // LOGGING STATE OF MATERIAL PROCESS
    ...(productionMode
      ? [
          {
            name: 'log.material.update.get.material.content',
            type: 'inproc',
            working_dir: './bolts',
            cmd: 'log-message-postgresql.js',
            inputs: [
              {
                source: 'get.material.content'
              }
            ],
            init: {
              pg: config.pg,
              postgres_table: 'material_update_queue',
              postgres_primary_id: 'material_id',
              message_primary_id: 'material_id',
              postgres_method: 'update',
              postgres_literal_attrs: {
                status:
                  'material existing content extracted: 1/4 steps completed'
              },
              document_error_path: 'message'
            }
          }
        ]
      : []),

    {
      name: 'extract.text.raw',
      type: 'inproc',
      working_dir: './bolts',
      cmd: 'extract-text-raw.js',
      inputs: [
        {
          source: productionMode
            ? 'log.material.update.get.material.content'
            : 'get.material.content'
        }
      ],
      init: {
        textract_config: {
          preserve_line_breaks: true,
          preserve_only_multiple_line_breaks: false,
          include_alt_text: true
        },
        document_location_path: 'material_url',
        document_location_type: 'remote',
        document_text_path: 'material_metadata.raw_text',
        document_error_path: 'message'
      }
    },

    // LOGGING STATE OF MATERIAL PROCESS
    ...(productionMode
      ? [
          {
            name: 'log.material.update.extract.text.raw',
            type: 'inproc',
            working_dir: './bolts',
            cmd: 'log-message-postgresql.js',
            inputs: [
              {
                source: 'extract.text.raw'
              }
            ],
            init: {
              pg: config.pg,
              postgres_table: 'material_update_queue',
              postgres_primary_id: 'material_id',
              message_primary_id: 'material_id',
              postgres_method: 'update',
              postgres_literal_attrs: {
                status: 'material content extracted: 2/4 steps completed'
              },
              document_error_path: 'message'
            }
          }
        ]
      : []),

    {
      name: 'extract.text.ttp',
      type: 'inproc',
      working_dir: './bolts',
      cmd: 'extract-text-ttp.js',
      inputs: [
        {
          source: productionMode
            ? 'log.material.update.extract.text.raw'
            : 'extract.text.raw'
        }
      ],
      init: {
        ttp: {
          user: config.preproc.ttp.user,
          token: config.preproc.ttp.token
        },
        tmp_folder: './tmp',
        document_title_path: 'title',
        document_language_path: 'language',
        document_text_path: 'material_metadata.raw_text',
        document_transcriptions_path: 'material_metadata.transcriptions',
        document_error_path: 'message',
        ttp_id_path: 'material_metadata.ttp_id'
      }
    },

    // LOGGING STATE OF MATERIAL PROCESS
    ...(productionMode
      ? [
          {
            name: 'log.material.update.extract.text.ttp',
            type: 'inproc',
            working_dir: './bolts',
            cmd: 'log-message-postgresql.js',
            inputs: [
              {
                source: 'extract.text.ttp'
              }
            ],
            init: {
              pg: config.pg,
              postgres_table: 'material_update_queue',
              postgres_primary_id: 'material_id',
              message_primary_id: 'material_id',
              postgres_method: 'update',
              postgres_literal_attrs: {
                status: 'material translations extracted: 3/4 steps completed'
              },
              document_error_path: 'message'
            }
          }
        ]
      : []),

    {
      name: 'extract.wikipedia',
      type: 'inproc',
      working_dir: './bolts',
      cmd: 'extract-wikipedia.js',
      inputs: [
        {
          source: productionMode
            ? 'log.material.update.extract.text.ttp'
            : 'extract.text.ttp'
        }
      ],
      init: {
        wikifier: {
          user_key: config.preproc.wikifier.userKey,
          wikifier_url: config.preproc.wikifier.wikifierUrl,
          max_length: 10000
        },
        document_text_path: 'material_metadata.raw_text',
        wikipedia_concept_path: 'material_metadata.wikipedia_concepts',
        document_error_path: 'message'
      }
    },

    // LOGGING STATE OF MATERIAL PROCESS
    ...(productionMode
      ? [
          {
            name: 'log.material.update.extract.wikipedia',
            type: 'inproc',
            working_dir: './bolts',
            cmd: 'log-message-postgresql.js',
            inputs: [
              {
                source: 'extract.wikipedia'
              }
            ],
            init: {
              pg: config.pg,
              postgres_table: 'material_update_queue',
              postgres_primary_id: 'material_id',
              message_primary_id: 'material_id',
              postgres_method: 'update',
              postgres_literal_attrs: {
                status: 'material wikipedia extracted: 4/4 steps completed'
              },
              document_error_path: 'message'
            }
          }
        ]
      : []),

    /****************************************
     * Send the completely processed materials
     * to kafka distribution
     */

    {
      name: 'kafka.material.content',
      type: 'inproc',
      working_dir: './bolts',
      cmd: 'kafka-message-forward.js',
      inputs: [
        {
          source: productionMode
            ? 'log.material.update.extract.wikipedia'
            : 'extract.wikipedia'
        }
      ],
      init: {
        kafka_host: config.kafka.host,
        kafka_topic: 'UPDATE.MATERIAL.CONTENT'
      }
    }
  ],
  variables: {}
};
