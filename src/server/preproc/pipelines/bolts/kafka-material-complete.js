/********************************************************************
 * PostgresQL storage process
 * This component receives the verified OER material object and
 * stores it into postgresQL database.
 */

// internal modules
const KafkaProducer = require('alias:lib/kafka-producer');

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

        // TODO: split the material into pieces and send the data in the correct order
        const {
            title,
            description,
            provideruri,
            materialurl,
            author,
            language: origin_language,
            datecreated,
            dateretrieved,
            type,
            materialmetadata,
            providertoken: provider_token,
            license
        } = material;

        ///////////////////////////////////////////
        // PREPARE MATERIAL AUTHORS
        ///////////////////////////////////////////

        let authors = author;
        if (authors) {
            authors = authors.replace(/[{\"}]/g, '');
            authors = authors.split(',').map(str => str.trim());
            if (authors.length === 1 && authors[0] === '') {
                authors = null;
            }
        }


        ///////////////////////////////////////////
        // PREPARE MATERIAL CONTENTS
        ///////////////////////////////////////////

        // material url information
        let material_url = {
            url: materialurl,
            material_id: null
        };

        // provider uri information
        let provider_uri = {
            url: provideruri
        };

        ///////////////////////////////////////////
        // PREPARE MATERIAL CONTENTS
        ///////////////////////////////////////////

        let material_contents = [];
        // prepare list of material contents
        if (materialmetadata.transcriptions) {
            let languages = Object.keys(materialmetadata.transcriptions);
            for (let language of languages) {
                let extensions = Object.keys(materialmetadata.transcriptions[language]);
                for (let extension of extensions) {
                    // get value of the language and extension
                    const value = materialmetadata.transcriptions[language][extension];

                    // define the type of the transcriptions
                    const type = language === origin_language ?
                        'transcription' :
                        'translation';

                    material_contents.push({
                        language,
                        type,
                        extension,
                        value: { value },
                        material_id: null
                    });
                }
            }
        } else if (materialmetadata.rawText) {
            // get the raw text of the material
            const value = materialmetadata.rawText;
            // prepare the material content object
            material_contents.push({
                language: origin_language,
                type: 'text_extraction',
                extension: 'plain',
                value: { value },
                material_id: null
            });
        }

        ///////////////////////////////////////////
        // PREPARE FEATURES PUBLIC
        ///////////////////////////////////////////

        // prepare of public feature - wikipedia concept
        let features_public = {
            name: 'wikipedia_concepts',
            value: { value: materialmetadata.wikipediaConcepts },
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
                authors,
                creation_date: datecreated,
                retrieved_date: dateretrieved,
                type: type.ext.toLowerCase(),
                mimetype: type.mime.toLowerCase(),
                license
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
