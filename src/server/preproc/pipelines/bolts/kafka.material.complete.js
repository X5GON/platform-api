/********************************************************************
 * PostgresQL storage process
 * This component receives the verified OER material object and
 * stores it into postgresQL database.
 */

// internal modules
const KafkaProducer = require('@library/kafka-producer');

/**
 * @class KafkaSender
 * @description Sends the messages to the corresponding kafka topic.
 */
class KafkaMaterialComplete {

    constructor() {
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[KafkaMaterialComplete ${this._name}]`;

        this._producer = new KafkaProducer(config.kafka_host);
        this._kafka_topic = config.kafka_topic;
        callback();
    }

    heartbeat() {
        // do something if needed
    }

    shutdown(callback) {
        // shutdown component
        callback();
    }

    receive(material, stream_id, callback) {

        // split the material into pieces and send the data in the correct order
        const {
            title,
            description,
            provider_uri,
            material_url,
            authors,
            language: origin_language,
            creation_date,
            retrieved_date,
            type,
            mimetype,
            material_metadata,
            provider: {
                token: provider_token
            },
            license
        } = material;

        ///////////////////////////////////////////
        // PREPARE MATERIAL AUTHORS
        ///////////////////////////////////////////

        let authors_copy = authors;

        if (authors_copy) {
            authors_copy = authors_copy.replace(/[{\"}]/g, '');
            authors_copy = authors_copy.split(',').map(str => str.trim());
            if (authors_copy.length === 1 && authors_copy[0] === '') {
                authors_copy = null;
            }
        }

        ///////////////////////////////////////////
        // PREPARE MATERIAL CONTENTS
        ///////////////////////////////////////////

        let material_contents = [];
        // prepare list of material contents
        if (material_metadata.transcriptions) {
            let languages = Object.keys(material_metadata.transcriptions);
            for (let language of languages) {
                let extensions = Object.keys(material_metadata.transcriptions[language]);
                for (let extension of extensions) {
                    // get value of the language and extension
                    const value = material_metadata.transcriptions[language][extension];

                    // define the type of the transcriptions
                    const type = language === origin_language ?
                        'transcription' :
                        'translation';

                    material_contents.push({
                        language,
                        type,
                        extension,
                        value: { value },
                        material_id: null,
                        last_updated: (new Date()).toISOString()
                    });
                }
            }
        } else if (material_metadata.raw_text) {
            // get the raw text of the material
            const value = material_metadata.raw_text;
            // prepare the material content object
            material_contents.push({
                language: origin_language,
                type: 'transcription',
                extension: 'plain',
                value: { value },
                material_id: null,
                last_updated: (new Date()).toISOString()
            });
        }

        ///////////////////////////////////////////
        // PREPARE FEATURES PUBLIC
        ///////////////////////////////////////////

        // prepare of public feature - wikipedia concept
        let features_public = {
            name: 'wikipedia_concepts',
            value: { value: material_metadata.wikipedia_concepts },
            re_required: true,
            record_id: null
        };

        ///////////////////////////////////////////
        // SEND TO THE DATABASES
        ///////////////////////////////////////////

        const message = {
            oer_materials: {
                title,
                description,
                language: origin_language,
                authors: authors_copy,
                creation_date,
                retrieved_date,
                type: type.toLowerCase(),
                mimetype: mimetype.toLowerCase(),
                license,
                ...material_metadata.metadata && { metadata: material_metadata.metadata }
            },
            material_contents,
            features_public,
            urls: {
                provider_uri,
                material_url
            },
            provider_token
        };

        // send the message to the database topics
        this._producer.send(this._kafka_topic, message, function (error) {
            if (error) { return callback(error); }
            return callback();
        });

    }
}

exports.create = function (context) {
    return new KafkaMaterialComplete(context);
};
