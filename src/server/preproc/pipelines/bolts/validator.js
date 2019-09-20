/********************************************************************
 * Material: Validation
 * This component validates the material object - checks if all of
 * the required attributes are present and sends them to the
 * appropriate stream.
 */


// the material schema
const materialSchema = require('../schemas/material');

class MaterialValidator {

    constructor() {
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[MaterialValidator ${this._name}]`;
        // create the postgres connection
        this._pg = require('@library/postgresQL')(config.pg);

        // initialize validator with
        this._validator = require('@library/schema-validator')();

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
        // validate the provided material
        const validation = this._validator.validateSchema(material, materialSchema);
        const stream_direction = validation.matching ? stream_id : 'incomplete';

        return this._changeStatus(material, stream_direction, callback);
    }

    /**
     * Changes the status of the material process and continues to the next bolt.
     * @param {Object} material - The material object.
     * @param {String} stream_id - The stream ID.
     * @param {Function} callback - THe final callback function.
     */
    _changeStatus(material, stream_id, callback) {
        const error = stream_id === 'incomplete' ? ' error' : '';
        return this._pg.update(
            { status: `material validated${error}` },
            { url: material.material_url },
            'material_process_pipeline', () => {
                // send material object to next component
                return this._onEmit(material, stream_id, callback);
            }
        );
    }
}

exports.create = function (context) {
    return new MaterialValidator(context);
};