/********************************************************************
 * Dfxp Extract Component
 * Extracts text from dfxp of materials that are considered video
 */

// external libraries
const franc = require('franc');

// internal libraries
const dfxp2srt = require('../../../../lib/python-dfxp2srt');
const Logger = require('../../../../lib/logging-handler')();
// create a logger instance for logging wikification process
const logger = Logger.createGroupInstance('dfxp-extract', 'preproc');

/**
 * Formats Material into a common schema.
 */
class DfxpExtract {

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

        // get the raw text associated with the videos
        try {
            let slug = material.providerUri.split('/')[3];
            let promise = dfxp2srt(slug, `../../../../data/videolectures/data`);
            // get the responses
            promise.then(data => {
                material.materialMetadata.dfxp = data;
                material.materialMetadata.rawText = data.map(obj => obj.rawText).join(' ');
                logger.info('raw text extraction from material successful', { materialUrl: material.materialUrl });
                return this._onEmit(material, stream_id, callback);
            }).catch(error => {
                logger.error('unable to extract raw text from material', {
                    materialUrl: material.materialUrl,
                    error: error.message
                });
                return callback();
            });
        } catch (error) {
            logger.error('unable to extract raw text from material', {
                materialUrl: material.materialUrl,
                error: error.message
            });
            return callback();
        }
    }
}

exports.create = function (context) { return new DfxpExtract(context); };