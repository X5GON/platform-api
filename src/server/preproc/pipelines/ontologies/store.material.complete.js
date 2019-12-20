// configurations
const config = require('@config/config');

const productionMode = config.environment === 'prod';

module.exports = {
  general: {
    heartbeat: 2000,
    pass_binary_messages: true
  },
  spouts: [
    {
      name: 'kafka.material.complete',
      type: 'inproc',
      working_dir: './spouts',
      cmd: 'kafka-spout.js',
      init: {
        kafka_host: config.kafka.host,
        topic: 'STORING.MATERIAL.COMPLETE',
        groupId: config.kafka.groupId
      }
    }
  ],
  bolts: [
    {
      name: 'store.pg.material.complete',
      type: 'inproc',
      working_dir: './bolts',
      cmd: 'store-pg-material-complete.js',
      inputs: [
        {
          source: 'kafka.material.complete'
        }
      ],
      init: {
        pg: config.pg,
        final_bolt: !productionMode
      }
    },

    // LOGGING STATE OF MATERIAL PROCESS
    ...(productionMode
      ? [
          {
            name: 'log.material.process.finished',
            type: 'inproc',
            working_dir: './bolts',
            cmd: 'log-message-postgresql.js',
            inputs: [
              {
                source: 'store.pg.material.complete'
              }
            ],
            init: {
              pg: config.pg,
              postgres_table: 'material_process_queue',
              postgres_primary_id: 'material_url',
              message_primary_id: 'urls.material_url',
              postgres_method: 'update',
              postgres_message_attrs: {
                material_id: 'oer_materials.material_id'
              },
              postgres_time_attrs: {
                end_process_time: true
              },
              postgres_literal_attrs: {
                status: 'material stored'
              },
              document_error_path: 'message',
              final_bolt: true
            }
          }
        ]
      : [])
  ],
  variables: {}
};
