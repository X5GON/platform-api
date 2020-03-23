// configurations
const config = require("@config/config");

module.exports = {
    general: {
        heartbeat: 2000,
        pass_binary_messages: true
    },
    spouts: [
        {
            name: "kafka.user-activities.visits",
            type: "inproc",
            working_dir: "./spouts",
            cmd: "kafka-spout.js",
            init: {
                kafka_host: config.kafka.host,
                topic: "STORE_USERACTIVITY_VISIT",
                group_id: config.kafka.groupId,
                high_water: 10,
                low_water: 1,
                from_offset: "latest"
            }
        },
        {
            name: "kafka.user-activities.video",
            type: "inproc",
            working_dir: "./spouts",
            cmd: "kafka-spout.js",
            init: {
                kafka_host: config.kafka.host,
                topic: "STORE_USERACTIVITY_VIDEO",
                group_id: config.kafka.groupId,
                high_water: 10,
                low_water: 1,
                from_offset: "latest"
            }
        }
    ],
    bolts: [
    /** **************************************
     * Storing user activity into database
     */
        {
            name: "store.pg.user-activity.visits",
            type: "inproc",
            working_dir: "./bolts",
            cmd: "store-pg-user-activity-visits.js",
            inputs: [
                {
                    source: "kafka.user-activities.visits"
                }
            ],
            init: {
                pg: config.pg
            }
        },

        /** **************************************
     * Logging user activity
     */
        {
            name: "log.user-activity.connect",
            type: "inproc",
            working_dir: "./bolts",
            cmd: "log-user-activity-connect.js",
            inputs: [
                {
                    source: "kafka.user-activities.visits"
                },
                {
                    source: "kafka.user-activities.video"
                }
            ],
            init: {
                file_name: "user-activities",
                level: "info",
                sub_folder: "user-activities"
            }
        }
    ],
    variables: {}
};
