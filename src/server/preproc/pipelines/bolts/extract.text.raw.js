/********************************************************************
 * Extraction: Text
 * This component extracts raw content text from the file provided.
 * To do this we use textract <https://github.com/dbashford/textract>
 * which is a text extraction library. It returns the content in raw
 * text.
 */

// external libraries
const textract = require('@library/textract');



/**
 * Formats Material into a common schema.
 */
class ExtractTextRaw {

    constructor() {
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[ExtractTextRaw ${this._name}]`;

        // set invalid types
        this._invalidTypes = config.invalid_types || [
            'zip',  // zip files
            'gz'    // zip files
        ];

        // configuration for textract
        this.textConfig = config.text_config;
        // create the postgres connection
        this._pg = require('@library/postgresQL')(config.pg);

        this._productionModeFlag = config.production_mode;
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

        if (material.material_metadata.raw_text) {
            // material already has the raw text
            return self._changeStatus(material, stream_id, callback);

        } else if (material.type && !self._invalidTypes.includes(material.type)) {
            // extract raw text from materialURL
            textract.fromUrl(material.material_url, (error, text) => {
                if (error) {
                    material.message = `${self._prefix} Not able to extract text.`;
                    return self._changeStatus(material, 'incomplete', callback);
                }
                // save the raw text within the metadata
                material.material_metadata.raw_text = text;
                return self._changeStatus(material, stream_id, callback);
            });

        } else {
            // send the material to the partial table
            material.message = `${self._prefix} Material does not have type provided.`;
            return self._changeStatus(material, 'incomplete', callback);
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
        const error = stream_id === 'incomplete' ? ' error' : '';

        if (!this._productionModeFlag) {
            // send material object to next component
            return this._onEmit(material, stream_id, callback);
        }

        return self._pg.update({ status: `extracted text${error}` }, { url: material.material_url }, 'material_process_queue', () => {
            // send material object to next component
            return self._onEmit(material, stream_id, callback);
        });
    }

}

exports.create = function (context) {
    return new ExtractTextRaw(context);
};