/********************************************************************
 * Text Extract Component
 * Extracts text from materials that are considered text (.pdf, .doc, etc.)
 */

// external libraries
const textract = require('textract');

// internal libraries
const Logger = require('../../../lib/logging-handler')();
// create a logger instance for logging wikification process
const logger = Logger.createGroupInstance('text-extract', 'preproc');


/**
 * Formats Material into a common schema.
 */
class TextExtract {

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
        logger.info('starting extracting raw text from material', { materialURL: material.materialURL });

        // extract raw text from materialURL
        textract.fromUrl(material.materialURL, (error, text) => {
            if (error) {
                logger.error('unable to extract raw text from material', { materialURL: material.materialURL });
                return callback();
            }
            // save the raw text within the metadata
            material.metadata.rawText = text;
            // log successful text extraction
            logger.info('extracting raw text from material successful', { materialURL: material.materialURL });
            // send material object to next component
            this._onEmit(material, stream_id, callback);
        });
    }
}

exports.create = function (context) { return new TextExtract(context); };