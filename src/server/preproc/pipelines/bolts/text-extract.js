/********************************************************************
 * Text Extract Component
 * Extracts text from materials that are considered text (.pdf, .doc, etc.)
 */

// external libraries
const textract = require('textract');
const franc = require('franc');

// internal libraries
const Logger = require('../../../../lib/logging-handler')();
// create a logger instance for logging wikification process
const logger = Logger.createGroupInstance('text-extract', 'preproc');

// list of invalid mime types
const invalidTypes = [
    'zip',  // zip files
    'gz'    // zip files
];

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
        logger.info('starting extracting raw text from material', { materialUrl: material.materialUrl });

        if (material.type && !invalidTypes.includes(material.type.ext)) {
            // extract raw text from materialURL
            textract.fromUrl(material.materialUrl, (error, text) => {
                if (error) {
                    logger.error('unable to extract raw text from material', { materialUrl: material.materialUrl });
                    return callback();
                }
                // save the raw text within the metadata
                material.materialMetadata.rawText = text;
                // ISO 639-2 Language Code 
                material.language = franc(text);
                // log successful text extraction
                logger.info('extracting raw text from material successful', { materialUrl: material.materialUrl });
                // send material object to next component
                return this._onEmit(material, stream_id, callback);
            });
        } else {
            // file is not text - skip it
            logger.error('invalid material type', { materialUrl: material.materialUrl });
            return callback();
        }
    }
}

exports.create = function (context) { return new TextExtract(context); };