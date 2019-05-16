// internal modules
const KafkaConsumer = require('@lib/kafka-consumer');
const KafkaProducer = require('@lib/kafka-producer');

// configurations
const config = require('@config/config');

// setup connection with the database
const pg = require('@lib/postgresQL')(config.pg);



class OERCollector {

    /**
     * Initialize the OER collector.
     */
    constructor() {
        // set kafka consumer & producers
        this._consumer = new KafkaConsumer(config.kafka.host, 'STORING.USERACTIVITY.VISIT', config.kafka.groupId);
        this._producer = new KafkaProducer(config.kafka.host);

        // crawling configuration
        // TODO: set to higher frequency (DO NOT CHANGE VALUE)
        // ! the frequency must fit into int 32-bit
        this.defaultFrequency = 7 * 24 * 60 * 60 * 1000; // one week

        // define topic names
        this._text_topic  = 'PROCESSING.MATERIAL.TEXT';
        this._video_topic = 'PROCESSING.MATERIAL.VIDEO';

        // initialize different retrievers
        this._apis = [];
        // go through retriever configurations
        for (let repository of config.preproc.retrievers) {
            repository.config.frequency = this.defaultFrequency;
            repository.config.callback = this._sendMaterials();
            repository.config.pg = pg;
            this.addAPI(repository);
        }
    }

    /**
     * Adds an API retriever to the list.
     * @param {Object} repository - The configurations of the api retriever.
     * @param {String} config.name - The name of the repository associated to the retriever.
     * @param {String} config.domain - The domain associated to the retriever.
     * @param {String} config.script - The name of the file containing the retriever.
     * @param {Object} config.config - The config file sent to the retriever constructor.
     */
    addAPI(repository) {
        let self = this;
        // if retriever is already set skip its addition
        for (let api of self._apis) {
            if (repository.name === api.name) { return; }
        }

        // initialize the retriever given by the config file
        let retriever = new (require(`./retrievers/${repository.script}`))(repository.config);

        // set crawling period
        // TODO: set material crawling function - ideally within the retriever
        retriever.start();
        // add retriever to the list
        self._apis.push({
            name: repository.name,
            domain: repository.domain,
            retriever
        });
    }

    /**
     * Removes an API retriever from the list.
     * @param {String} retrieverName - The retriever to be removed.
     */
    removeAPI(retrieverName) {
        // go through all of the apis and remove the appropriate retriever
        for (let i = 0; i < this._apis.length; i++) {
            if (retrieverName === this._apis[i].name) {
                this._apis[i].retriever.stop();
                this._apis.splice(i, 1); break;
            }
        }
    }

    /**
     * Start retriever crawling.
     * @param {String} retrieverName - The retriever to start working.
     */
    startAPI(retrieverName) {
        // go through all of the apis and start the appropriate retriever
        for (let i = 0; i < this._apis.length; i++) {
            if (retrieverName === this._apis[i].name) {
                this._apis[i].retriever.start();
                break;
            }
        }
    }

    /**
     * Stop retriever from crawling.
     * @param {String} retrieverName - The retriever to stop working.
     * @param {Boolean} [allFlag=false] - If true, stop all retrievers.
     */
    stopAPI(retrieverName, allFlag=false) {
        if (allFlag) {
            // stop all retrievers
            for (let i = 0; i < this._apis.length; i++) {
                this._apis[i].retriever.stop();
            }
        } else {
            // go through all of the apis and stop the appropriate retriever
            for (let i = 0; i < this._apis.length; i++) {
                if (retrieverName === this._apis[i].name) {
                    this._apis[i].retriever.stop(); break;
                }
            }
        }
    }

    /**
     * Process the next message in the retrieval.topic.
     */
    next() {
        let self = this;
        // get message sent to retrieval.topics
        const log = this._consumer.next();
        if (!log) { return null; }
        // check if material is in the database
        pg.select({ url: log.url }, 'urls', (error, results) => {
            if (error) {
                // log postgres error
                logger.error('error [postgres.select]: unable to select a material',
                    logger.formatRequest(req, { error: error.message })
                );
                return null;
            }

            if (results.length === 0) {
                let retriever = null;
                // find and select appropriate retriever
                for (let api of self._apis) {
                    // TODO: integrate an appropriate retriever selection
                    if (log.url && log.url.includes(api.domain)) {
                        retriever = api.retriever; break;
                    }
                }

                if (retriever) {
                    // the retriever is present
                    retriever.getMaterial(log.url, self._sendMaterials());
                }
            }
        });
    }

    /**
     * Creates a function responsible for material redirection in the
     * preprocessing pipeline.
     * @returns {Function} The function with the inputs error and materials. It
     * sends the material in the appropriate kafka topic.
     */
    _sendMaterials() {
        let self = this;

        return function (error, materials) {
            // TODO: proper error logging
            if (error) { console.log(error); return; }
            for (let material of materials) {
                // send material to the appropriate pipeline
                // TODO: check/integrate an appropriate type selection
                if (material.type.mime && material.type.mime.includes('video')) {
                    self._producer.send(self._video_topic, material);
                } else {
                    self._producer.send(self._text_topic, material);
                }
            }
        };
    }
}

///////////////////////////////////////////////////////
// Start Collector Processes
///////////////////////////////////////////////////////


// initialize a handler
const collectors = new OERCollector();

// run indefinetly - until manual stop
setInterval(() => { collectors.next(); }, 1000);


function shutdown(error) {
    if (error) { console.log(error); }

    // first stop all APIs
    collectors.stopAPI(null, true);

    // stop the Kafka consumer before
    // shutting down the process
    collectors._consumer.stop(() => {
        console.log('Stopped retrieving requests');
        return process.exit(0);
    });
}

// do something when app is closing
process.on('exit', shutdown);

// catches ctrl+c event
process.on('SIGINT', shutdown);

// catches uncaught exceptions
process.on('uncaughtException', shutdown);

// handles message
process.on('message', (msg) => {
    process.send(collectors._apis.map(api => api.name));
});