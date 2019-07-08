/********************************************************************
 * Extraction: Text
 * This component extracts raw content text from the file provided.
 * To do this we use textract <https://github.com/dbashford/textract>
 * which is a text extraction library. It returns the content in raw
 * text.
 */

// external libraries
const textract = require('alias:lib/textract');



/**
 * Formats Material into a common schema.
 */
class ExtractionText {

    constructor() {
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[ExtractionText ${this._name}]`;

        // set invalid types
        this._invalidTypes = config.invalid_types || [
            'zip',  // zip files
            'gz'    // zip files
        ];

        // configuration for textract
        this.textConfig = config.text_config;
        // create the postgres connection
        this._pg = require('alias:lib/postgresQL')(config.pg);
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
        const self = this;
        if (material.type && !self._invalidTypes.includes(material.type.ext)) {
            // extract raw text from materialURL
            textract.fromUrl(material.materialurl, (error, text) => {
                if (error) {
                    material.message = `${self._prefix} Not able to extract text.`;
                    return self._changeStatus(material, 'stream_partial', callback);
                }
                // save the raw text within the metadata
                material.materialmetadata.rawText = text;
                return self._changeStatus(material, stream_id, callback);
            });
        } else {
            // send the material to the partial table
            material.message = `${self._prefix} Material does not have type provided.`;
            return self._changeStatus(material, 'stream_partial', callback);
        }
    }

    /**
     * Changes the status of the material process and continues to the next bolt.
     * @param {Object} material - The material object.
     * @param {String} stream_id - The stream ID.
     * @param {Function} callback - THe final callback function.
     */
    _changeStatus(material, stream_id, callback) {
        const self = this;
        const error = stream_id === 'stream_partial' ? ' error' : '';
        return self._pg.update({ status: `extracted text${error}` }, { url: material.materialurl }, 'material_process_pipeline', () => {
            // send material object to next component
            return self._onEmit(material, stream_id, callback);
        });
    }

}

exports.create = function (context) {
    return new ExtractionText(context);
};