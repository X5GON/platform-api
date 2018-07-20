// internal modules
const KafkaConsumer = require('../../../lib/kafka-consumer');


// configurations
const kafkaConfig = require('../../../config/kafkaconfig');
const apiConfig = require('../config/apiconfig');
// setup connection with the database
const pg = require('../../../lib/postgresQL')(
    require('../../../config/pgconfig')
);

class APIHandler {

    constructor() {
        let self = this;
        // set kafka consumer
        self._consumer = new KafkaConsumer(kafkaConfig.host, 'retrieval-topic');
        // initialize different retrievers
        self._apis = [];

        // set up retrievers for repositories
        pg.select({ }, 'repositories', (error, results) => {
            if (error) { console.log(error); return; }

            for (let repository of results) {

                if (apiConfig[repository.name]) {

                    // repository api is available
                    const configuration = apiConfig[repository.name];
                    let retriever = new (require(`./${configuration.script}`))(configuration);
                    self._apis.push({
                        token: configuration.token,
                        domain: configuration.domain,
                        retriever
                    });
                }
            }

        });
    }

    next() {
        let self = this;
        // get message sent to retrieval-topics
        const log = this._consumer.next();

        if (!log) { console.log('No messages'); return; }

        // check if material is in the database
        pg.select({ materialUrl: log.url }, 'oer_materials', (error, results) => {
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
                    if (log.url.includes(api.domain)) {
                        retriever = api.retriever; break;
                    }
                }

                if (retriever) {
                    retriever.get(log.url, (error, material) => {
                        if (error) { console.log(error); }
                        console.log(material);
                    });
                }
            }
        });
    }

}

// initialize a handler
const handler = new APIHandler();

// run indefinetly - until manual stop
setInterval(() => {
    console.log('interval');
    console.log(handler.next());
}, 1000);


function shutdown(error) {
    handler._consumer.stop(() => {
        process.exit(0);
    });
}

// do something when app is closing
process.on('exit', shutdown);

// catches ctrl+c event
process.on('SIGINT', shutdown);

// catches uncaught exceptions
process.on('uncaughtException', shutdown);