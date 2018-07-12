/********************************************************************
 * Material Format Component
 * This component receives the OER material in its raw form and it
 * formats into a common schema.
 */

// external libraries
const http = require('http');
const https = require('https');
const fileType = require('file-type');

// internal libraries
const Logger = require('../../../lib/logging-handler')();
// create a logger instance for logging wikification process
const logger = Logger.createGroupInstance('material-format', 'preproc');


/**
 * Formats Material into a common schema.
 */
class MaterialFormat {

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

        // TODO: create the object containing the material format
        const formatedMaterial = {
            title: material.title,
            description: material.description,
            providerUri: material.providerUri,
            materialUrl: material.materialUrl,
            author: material.author,
            dateCreated: material.dateCreated,
            dateRetrieved: material.dateRetrieved,
            providerMetadata: material.providerMetadata,
            materialMetadata: { }
        };
        
        if (material.materialUrl.indexOf('http://') === 0) {
            http.get(material.materialUrl, res => {
                this._handleResponse(res, material, formatedMaterial, stream_id, callback);
            });
        } else if (material.materialUrl.indexOf('https://') === 0) {
            https.get(material.materialUrl, res => {
                this._handleResponse(res, material, formatedMaterial, stream_id, callback);
            });
        } else {
            logger.error('materialUrl is not valid', { material });
            return callback();
        }
    }

    _handleResponse(response, material, formatedMaterial, stream_id, callback) {
        if (response.statusCode !== 200) {
            logger.warn(`Request denied with code ${response.statusCode}`, { material });
            logger.info('material format successful', { material, formatedMaterial });
            // send formated material to the next component
            return this._onEmit(formatedMaterial, stream_id, callback);
        } else {
            response.on('data', chunk => {
                response.destroy();
                formatedMaterial.type = fileType(chunk);
                // log material formating process
                logger.info('material format successful', { material, formatedMaterial });
                // send formated material to the next component
                return this._onEmit(formatedMaterial, stream_id, callback);
            });
        }
    }

}

exports.create = function (context) { return new MaterialFormat(context); };