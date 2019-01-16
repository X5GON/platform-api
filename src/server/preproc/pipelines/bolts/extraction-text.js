/********************************************************************
 * Extraction: Text
 * This component extracts raw content text from the file provided.
 * To do this we use textract <https://github.com/dbashford/textract>
 * which is a text extraction library. It returns the content in raw
 * text.
 */

// external libraries
const textract = require('textract');

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

        if (material.type && !this._invalidTypes.includes(material.type.ext)) {
            // extract raw text from materialURL
            textract.fromUrl(material.materialurl, (error, text) => {
                if (error) {
                    material.message = `${this._prefix} Not able to extract text.`;
                    return this._onEmit(material, 'stream_partial', callback);
                }
                // save the raw text within the metadata
                material.materialmetadata.rawText = text;
                // send material object to next component
                return this._onEmit(material, stream_id, callback);
            });
        } else {
            // send the material to the partial table
            material.message = `${this._prefix} Material does not have type provided.`;
            return this._onEmit(material, 'stream_partial', callback);
        }
    }
}

exports.create = function (context) {
    return new ExtractionText(context);
};