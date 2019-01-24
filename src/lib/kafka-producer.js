// external modules
const k = require('kafka-node');

/**
 * Kafka producer class.
 */
class KafkaProducer {

    constructor(host, topics) {
        let self = this;
        const options = {
            kafkaHost: host
        };

        this._ready = false;
        this._messages = [];
        const client = new k.KafkaClient(options);

        // create topics
        client.createTopics(topics, (error, result) => {
            if (error) { console.log(error); console.log(result); }

            // create a kafka producer
            self._producer = new k.HighLevelProducer(client);

            // make the producer ready
            self._producer.on('ready', function () {

                self._ready = true;
                // check if there are any messages not sent
                if (self._messages.length) {
                    // send all messages
                    while (self._messages.length) {
                        // get the first element from the array of messages
                        const message = self._messages[0];
                        // update the messages array
                        self._messages = self._messages.slice(1);
                        // send the message to the corresponsing topic
                        self._producer.send([message], (xerror, data) => {
                            if (xerror) { console.log(xerror); return; }
                        });
                    }
                }
            });

        });



    }

    /**
     * Sends the message to the appropriate topic.
     * @param {String} topic - The topic where the message is sent.
     * @param {Object} msg - The message.
     */
    send(topic, msg) {
        let self = this;

        // prepare the message in string
        const messages = JSON.stringify(msg);
        if (self._ready) {
            // the producer is ready to send the messages
            const payload = [{ topic, messages }];
            self._producer.send(payload, (xerror, data) => {
                if (xerror) { console.log(xerror); return; }
            });
        } else {
            // store the topic and message to send afterwards
            self._messages.push({ topic, messages });
        }
    }

}

module.exports = KafkaProducer;