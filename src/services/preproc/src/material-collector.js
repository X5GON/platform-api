/**
 * Material Collector component
 * This component listens to the incoming user activity data
 * and then crawls pages that were previously not seen.
 *
 */
require("module-alias/register");

// configurations
const config = require("@config/config");
// internal modules
const KafkaConsumer = require("@library/kafka-consumer");
const KafkaProducer = require("@library/kafka-producer");
// material mimetypes used for type selection
const mimetypes = require("@config/mimetypes");
// setup connection with the database
const postgresQL = require("@library/postgresQL");
// logger for storing activity
const Logger = require("@library/logger");

// create a logger for platform requests
const logger = Logger.createGroupInstance("material-collector", "preproc", config.isProduction);

/**
 * @class MaterialCollector
 * @description Collects material metadata based on the
 * provided user activity data.
 */
class MaterialCollector {
    /**
     * Initialize the OER collector.
     * @param {Object} config - The configuration file.
     * @param {Object} config.kafka - The kafka configuration values.
     * @param {String} config.kafka.host - The kafka host to which the components connect.
     * @param {String} config.kafka.groupId - The kafka group to which the components connect.
     * @param {Object} config.pg - The postgres configuration values.
     */
    constructor(config) {
        // set postgresQL connection
        this._pg = postgresQL(config.pg);

        // set kafka consumer & producers
        this._consumer = new KafkaConsumer(config.kafka.host, "STORE_USERACTIVITY_VISIT", `${config.kafka.groupId}.MATERIAL.COLLECTOR`);
        this._producer = new KafkaProducer(config.kafka.host);
        // define kafka topic names
        this._text_topic = "PREPROC_MATERIAL_TEXT";
        this._video_topic = "PREPROC_MATERIAL_VIDEO";

        // initialize retriever list
        this._apis = [];
        // go through retriever configurations and add them to the list
        for (let retriever of config.preproc.retrievers) {
            retriever.config.callback = this._sendMaterials.bind(this);
            retriever.config.token = retriever.token;
            retriever.config.pg = this._pg;
            this.addRetriever(retriever);
        }
        // set the production mode flag
        this._productionModeFlag = config.isProduction;
        // got initialization process
        logger.info("[MaterialCollector] collector initialized");
    }

    /**
     * Adds an API retriever to the list.
     * @param {Object} settings - The configurations of the api retriever.
     * @param {String} settings.name - The name of the repository associated to the retriever.
     * @param {String} settings.domain - The domain associated to the retriever.
     * @param {String} settings.token - The domain associated to the retriever.
     * @param {String} settings.script - The name of the file containing the retriever.
     * @param {Object} settings.config - The config file sent to the retriever constructor.
     * @returns {Boolean} True, if the retriever was added. Otherwise, returns false.
     */
    addRetriever(settings) {
        let self = this;
        // if retriever is already set skip its addition
        for (let api of self._apis) {
            // check if retriever is already in added
            if (settings.token === api.token) { return false; }
        }

        // initialize the retriever given by the config file
        let retriever = new (require(`./retrievers/${settings.script}`))(settings.config);
        // add retriever to the list
        self._apis.push({
            name: settings.name,
            domain: settings.domain,
            token: settings.token,
            retriever
        });
        logger.info("[Retriever] Adding new retriever", {
            name: settings.name,
            domain: settings.domain
        });
        return true;
    }

    /**
     * Removes an API retriever from the list.
     * @param {String} token - The retriever to be removed.
     * @returns {Boolean} True if the retriever was removed. Otherwise, returns false.
     */
    removeRetriever(token) {
        let removed = false;
        // go through all of the apis and remove the appropriate retriever
        for (let i = 0; i < this._apis.length; i++) {
            if (token === this._apis[i].token) {
                logger.info("[Retriever] removing retriever", {
                    name: this._apis[i].name,
                    domain: this._apis[i].domain
                });
                // first stop the retriever
                this._apis[i].retriever.stop();
                // remove the retriever from the list
                this._apis.splice(i, 1);
                removed = true;

                break;
            }
        }
        return removed;
    }

    /**
     * Start retriever crawling.
     * @param {String} token - The retriever to start working.
     * @returns {Boolean} True if the retriever was started. Otherwise, returns false.
     */
    startRetriever(token) {
        let started = false;
        // go through all of the apis and start the appropriate retriever
        for (let i = 0; i < this._apis.length; i++) {
            if (token === this._apis[i].token) {
                logger.info("[Retriever] start retriever", {
                    name: this._apis[i].name,
                    domain: this._apis[i].domain
                });
                this._apis[i].retriever.start();
                started = true; break;
            }
        }
        return started;
    }

    /**
     * Stop retriever from crawling.
     * @param {String} token - The retriever to stop working.
     * @param {Boolean} [allFlag=false] - If true, stop all retrievers.
     * @returns {Boolean} True if the retriever was stopped. Otherwise, returns false.
     */
    stopRetriever(token, allFlag = false) {
        if (allFlag) {
            // stop all retrievers
            for (let i = 0; i < this._apis.length; i++) {
                logger.info("[Retriever] stop all retrievers");
                this._apis[i].retriever.stop();
            }
            return true;
        } else {
            let stopped = false;
            // go through all of the apis and stop the appropriate retriever
            for (let i = 0; i < this._apis.length; i++) {
                if (token === this._apis[i].token) {
                    logger.info("[Retriever] stop retriever", {
                        name: this._apis[i].name,
                        domain: this._apis[i].domain
                    });
                    this._apis[i].retriever.stop();
                    stopped = true; break;
                }
            }
            return stopped;
        }
    }

    /**
     * Process the next message in the retrieval.topic.
     */
    processNext() {
        let self = this;
        // get message sent to retrieval.topics
        const log = this._consumer.next();
        if (!log) { return null; }


        if (log.material) {
            // check if there is a material url
            const url = log.material.materialurl;
            // check if the material is already in the database
            // (should have an URL in the urls table)
            return self._pg.select({ url }, "material_process_queue", (error, results) => {
                if (error) {
                    // log postgres error
                    logger.error("error [postgres.select]: unable to select a material",
                        { error: error.message });
                    return null;
                }
                if (!results.length) {
                    logger.info("[Retriever] process next material from log", {
                        materialurl: url,
                        timestamp: log.visitedOn
                    });
                    // send the material directly to the pipeline
                    return self._sendMaterials(null, [log.material]);
                }
                logger.info("[Retriever] material already in processing pipeline", {
                    materialurl: url,
                    timestamp: log.visitedOn
                });
            });
        } else if (log.provider) {
            // find the appropriate retriever for retrieving the materials
            for (let api of self._apis) {
                // find the retriver based on the provider token
                if (log.provider === api.token) {
                    logger.info("[Retriever] process next log with retriever", {
                        retrieverName: api.name,
                        retrieverDomain: api.domain,
                        materialUrl: log.url
                    });
                    // if retriever is present get the material
                    return api.retriever.getMaterial(log.url, self._sendMaterials.bind(self));
                }
            }
            logger.warn("[Retriever] no retrievers to process log", {
                provider: log.provider,
                url: log.url
            });
        }
    }

    /**
     * Redirect the material in the coresponding preprocessing pipeline.
     * @param {Object} error - The error object, if something went wrong.
     * @param {Object[]} materials - The list of materials to be sent to the processing pipelines.
     */
    _sendMaterials(error, materials) {
        let self = this;
        if (error) {
            logger.error("[Retriever] error when processing materials", {
                error: {
                    message: error.message,
                    stack: error.stack
                }
            });
            return;
        }

        for (let material of materials) {
            // get material mimetype and decide where to send the material metadata
            const mimetype = material.type.mime;
            if (mimetype && mimetypes.video.includes(mimetype)) {
                self._sendToKafka(material, self._video_topic, "video");
            } else if (mimetype && mimetypes.audio.includes(mimetype)) {
                self._sendToKafka(material, self._video_topic, "audio");
            } else if (mimetype && mimetypes.text.includes(mimetype)) {
                self._sendToKafka(material, self._text_topic, "text");
            } else {
                logger.warn("[Retriever] material mimetype not recognized", {
                    mimetype
                });
            }
        }
    }


    /**
     * Sends the material to the appropriate kafka topic.
     * @param {Object} material - The material object.
     * @param {String} topic - The kafka topic to send the material.
     * @param {String} type - The material type.
     */
    _sendToKafka(material, topic, type) {
        let self = this;

        if (!self._productionModeFlag) {
            // just send it in development mode
            logger.info(`[upload] ${type} material = ${material.material_url}`);
            // send the video material
            return self._producer.send(topic, material);
        }

        // insert to postgres process pipeline
        this._pg.upsert({ url: material.material_url }, { url: null }, "material_process_queue", (xerror) => {
            if (xerror) {
                logger.error("[error] postgresql", {
                    error: {
                        message: xerror.message,
                        stack: xerror.stack
                    }
                });
                return;
            }
            logger.info(`[upload] ${type} material = ${material.material_url}`);
            // send the video material
            return self._producer.send(topic, material);
        });
    }
}

// /////////////////////////////////////////////////////
// Start Collector Processes
// /////////////////////////////////////////////////////


// initialize a material collector
const collector = new MaterialCollector(config);

// set interval to check for new log after every
// secord - until the script is manually stopped
const interval = setInterval(() => { collector.processNext(); }, 500);

/**
 * Gracefully shuts down the collector object.
 * @param {Object} error - The error triggered when shutting
 * down the process.
 * @returns {Object} The process exit with status 0.
 */
function shutdown(error) {
    if (error) { console.log(error); }
    clearInterval(interval);
    // first stop all retrievers
    collector.stopRetriever(null, true);
    // stop the Kafka consumer before
    // shutting down the process
    collector._consumer.stop(() => {
        console.log("Stopped retrieving requests");
        return process.exit(0);
    });
}

// do something when app is closing
process.on("exit", shutdown);
// catches ctrl+c event
process.on("SIGINT", shutdown);
// catches uncaught exceptions
process.on("uncaughtException", shutdown);

// handles message
process.on("message", (msg) => {
    process.send(collector._apis.map((api) => api.name));
});
