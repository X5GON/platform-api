/********************************************************************
 * Videolectures Format Component
 * This component receives the Videolectures material in its raw form and it
 * formats into a common schema.
 */

// external libraries
const http = require('http');
const https = require('https');
const fileType = require('file-type');

// internal libraries
const Logger = require('../../../../lib/logging-handler')();
// create a logger instance for logging wikification process
const logger = Logger.createGroupInstance('videolectures-format', 'preproc');


/**
 * Formats Material into a common schema.
 */
class VideolecturesFormat {

    constructor(context) {
        this._name = null;
        this._onEmit = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._onEmit = config.onEmit;
        // use other fields from config to control your execution
        callback();
    }

    heartbeat() {
        // do something if needed
    }

    shutdown(callback) {
        // prepare for gracefull shutdown, e.g. save state
        callback();
    }

    receive(material, stream_id, callback) {
        // log the begining of material formating
        logger.info('starting formating material', { material });
        
        // TODO: get material attributes
        if (!material.enabled || !material.public) {
            logger.warn('The material is not enabled or public', { material });
            return callback();
        }

        // TODO: create the object containing the material format
        const formatedMaterial = {
            title: material.title,
            slug: material.slug,
            description: material.description,
            providerUri: `http://videolectures.net/${material.slug}/`,
            materialUrl: `http://videolectures.net/${material.slug}/`,
            author: material.authors,
            dateCreated: material.time,
            dateRetrieved: material.time,
            type: { ext: 'mp4', mime: 'video/mp4' },
            providerMetadata: { title: 'Videolectures.NET', url: 'http://videolectures.net/' },
            materialMetadata: { }
        };

        logger.info('material format successful', { material, formatedMaterial });
        // send formated material to the next component
        return this._onEmit(formatedMaterial, stream_id, callback);
    }
}

exports.create = function (context) { return new VideolecturesFormat(context); };