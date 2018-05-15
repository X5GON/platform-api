/********************************************************************
 * Material Validator Component
 * This component receives the OER material object and validates 
 * its values
 */

// internal libraries
const Logger = require('../../../lib/logging-handler')();
// create a logger instance for logging wikification process
const logger = Logger.createGroupInstance('material-format', 'preproc');

const validator = require('../../../lib/schema-validator')();

/**
 * Formats Material into a common schema.
 */
class MaterialValidator {

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
        logger.info('starting validating material', { material });
        
        
        // TODO: add material validation function

        logger.info('material format successful', { material });
        // send formated material to the next component
        this._onEmit(material, stream_id, callback);
    }
}

exports.create = function (context) { return new MaterialValidator(context); };