// external modules
const JsonValidator = require('jsonschema').Validator;
// internal modules
const Logger = require('./logging-handler')();

/**
 * The JSON validator class.
 */
class Validator {

    /**
     * @description Initializes the JSON validator.
     * @param {Object} params - The constructor parameter.
     */
    constructor(params) {
        let self = this;
        // save the JSON validator
        self._validator = new JsonValidator();
        // the json schemas used to validate
        self.schemas = params;
        // create logger instance for validator
        self.logger = Logger.createInstance('validation', 'info', 'validations');
    }

    /**
     * @description Object validation function.
     * @param {Object} object - The validated object.
     * @param {Object} schema - The schema the message object must follow.
     * @returns {Boolean} Returns `true` if object matches schema. Otherwise, `false`.
     */
    validateSchema(object, schema) {
        let self = this;
        let validation = self._validator.validate(object, schema);
        if (validation.errors.length) {
            // log the validation errors
            self.logger.warn('validator found errors', { object, errors: validation.errors });
            return false;
        } else {
            // validation found no errors -
            // object seems to follow the schema
            return true;
        }
    }

    /**
     * @description Checks if the object is an integer.
     * @param {Object} object - The object to be validated.
     * @returns {Boolean} True if the `object` is an integer. Otherwise, return false.
     */
    validateInteger(object) {
        if (Number.isInteger(object)) {
            // the object is indeed an integer
            return true;
        } else {
            // the object is certantly not an integer
            return false;
        }
    }
}

module.exports = function (params) {
    return new Validator(params);
};