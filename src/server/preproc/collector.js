// internal modules
const KafkaConsumer = require('../../lib/kafka-consumer');
const KafkaProducer = require('../../lib/kafka-producer');

// configurations
const kafkaConfig = require('../../config/kafkaconfig');
const apiConfig = require('./config/apiconfig');
// setup connection with the database
const pg = require('../../lib/postgresQL')(
    require('../../config/pgconfig')
);

class OERCollector {

    constructor() {
        let self = this;
        // set kafka consumer of user activity data
        self._consumer = new KafkaConsumer(kafkaConfig.host, 'retrieval-topic');
        // set kafka producers for pipeline
        self._producer = new KafkaProducer(kafkaConfig);

        // initialize different retrievers
        self._apis = [];

        // set up retrievers for repositories
        pg.select({ }, 'repositories', (error, results) => {
            if (error) { console.log(error); return; }

            for (let repository of results) {
                // check if repository name matches api configuration
                if (apiConfig[repository.name]) {
                    // repository api is available - add it to the collector
                    const settings = apiConfig[repository.name];
                    let retriever = new (require(`./retrievers/${settings.script}`))(settings.config);
                    self._apis.push({
                        domain: settings.domain,
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
                    // TODO: integrate an appropriate retriever selection
                    if (log.url && log.url.includes(api.domain)) {
                        retriever = api.retriever; break;
                    }
                }

                if (retriever) {
                    // the retriever is present
                    retriever.get(log.url, (error, materials) => {
                        // TODO: proper error logging
                        if (error) { console.log(error); return; }
                        for (let material of materials) {
                            // send material to the appropriate pipeline
                            // TODO: check/integrate an appropriate type selection
                            if (material.type.mime && material.type.mime.includes('video')) {
                                self._producer.send('video-topic', material);
                            } else {
                                self._producer.send('text-topic', material);
                            }
                        }
                    });
                } else {
                    // TODO: store url and provider/source in postgres
                }
            } else {
                console.log('found results');
            }

        });
    }

}

// initialize a handler
const collector = new OERCollector();

// run indefinetly - until manual stop
setInterval(() => {
    console.log('interval');
    if (collector.next()) {
        console.log(collector.next());
    }
}, 1000);


function shutdown(error) {
    if (error) { console.log(error); }
    collector._consumer.stop(() => {
        console.log('Stop retrieving requests');
        process.exit(0);
    });
}

// do something when app is closing
process.on('exit', shutdown);

// catches ctrl+c event
process.on('SIGINT', shutdown);

// catches uncaught exceptions
process.on('uncaughtException', shutdown);