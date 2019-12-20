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
      name: 'input.kafka.video',
      type: 'inproc',
      working_dir: './spouts',
      cmd: 'kafka-spout.js',
      init: {
        kafka_host: config.kafka.host,
        topic: 'UPDATE.MATERIAL.VIDEO',
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
                source: 'input.kafka.video'
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
      name: 'extract.video.ttp',
      type: 'inproc',
      working_dir: './bolts',
      cmd: 'extract-video-ttp.js',
      inputs: [
        {
          source: productionMode
            ? 'log.material.update.started'
            : 'input.kafka.video'
        }
      ],
      init: {
        ttp: {
          user: config.preproc.ttp.user,
          token: config.preproc.ttp.token
        },
        document_language_path: 'language',
        document_location_path: 'material_url',
        document_authors_path: 'authors',
        document_title_path: 'title',
        document_text_path: 'material_metadata.raw_text',
        document_transcriptions_path: 'material_metadata.transcriptions',
        ttp_id_path: 'material_metadata.ttp_id'
      }
    },

    // LOGGING STATE OF MATERIAL PROCESS
    ...(productionMode
      ? [
          {
            name: 'log.material.update.extract.video.ttp',
            type: 'inproc',
            working_dir: './bolts',
            cmd: 'log-message-postgresql.js',
            inputs: [
              {
                source: 'extract.video.ttp'
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
                  'material transcriptions and translations retrieved: 1/4 steps completed'
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
            ? 'log.material.update.extract.video.ttp'
            : 'extract.video.ttp'
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
            name: 'log.material.process.extract.wikipedia',
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
                status: 'material wikified: 2/3 steps completed'
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
            ? 'log.material.process.extract.wikipedia'
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
