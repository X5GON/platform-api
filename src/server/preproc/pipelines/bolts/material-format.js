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
        // send the formatted material to next component
        return this._onEmit(formatMaterial, stream_id, callback);
    }
}

exports.create = function (context) {
    return new MaterialFormat(context);
};