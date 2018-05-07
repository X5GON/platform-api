/********************************************************************
 * Material Format Component
 * This component receives the OER material in its raw form and it
 * formats into a common schema.
 */

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
            provider: material.provider,
            materialURL: material.materialURL,
            author: material.author,
            created: material.created,
            type: material.type,
            language: material.language,
            metadata: { }
        };
        
        // log material formating process
        logger.info('material format successful', { material, formatedMaterial });
        // send formated material to the next component
        this._onEmit(formatedMaterial, stream_id, callback);
    }
}

exports.create = function (context) { return new MaterialFormat(context); };