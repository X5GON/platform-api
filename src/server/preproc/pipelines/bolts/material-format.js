/********************************************************************
 * Material Format Component
 * This component receives the OER material in its raw form and it
 * formats into a common schema.
 */

/**
 * Formats Material into a common schema.
 */
class MaterialFormat {

    constructor() {
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[MaterialFormat ${this._name}]`;

        // get fields to be extracted
        this._fields = config.fields;
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
        // set placeholder
        let formatMaterial = { };
        // extract material fields and assign them to the formatted example
        for (let field of this._fields) {
            formatMaterial[field.name] = material[field.name] || field.default;
        }
        return this._changeStatus(formatMaterial, stream_id, callback);
    }

    /**
     * Changes the status of the material process and continues to the next bolt.
     * @param {Object} material - The material object.
     * @param {String} stream_id - The stream ID.
     * @param {Function} callback - THe final callback function.
     */
    _changeStatus(material, stream_id, callback) {
        const error = stream_id === 'stream_partial' ? ' error' : '';
        return this._pg.update(
            { status: `material data formated${error}` },
            { url: material.materialurl },
            'material_process_pipeline', () => {
                // send material object to next component
                return this._onEmit(material, stream_id, callback);
            }
        );
    }
}

exports.create = function (context) {
    return new MaterialFormat(context);
};