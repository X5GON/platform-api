/** ******************************************************************
 * Validate Message
 * This component validates the material object using the
 * JSON Schema validator component.
 */

// basic bolt template
const BasicBolt = require("./basic-bolt");

class MessageValidate extends BasicBolt {
    constructor() {
        super();
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[MessageValidate ${this._name}]`;

        // initialize validator with
        this._validator = require("@library/schema-validator")();
        // the validation schema
        this._JSONSchema = config.json_schema;

        // the path to where to store the error
        this._documentErrorPath = config.document_error_path || "error";
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

    receive(message, stream_id, callback) {
        // validate the provided material
        const { isValid } = this._validator.validateSchema(message, this._JSONSchema);
        const stream_direction = isValid ? stream_id : "stream_error";
        // add errors it present
        if (isValid) {
            this.set(message, this._documentErrorPath, "System Error: Material not in Correct Format");
        }
        // continue to the next bolt
        return this._onEmit(message, stream_direction, callback);
    }
}

exports.create = function (context) {
    return new MessageValidate(context);
};
