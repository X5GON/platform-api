/** **********************************************
 * JSON Validator Module
 * This module stores different JSON schemas
 * provided by the user and validates the
 * JSON objects.
 */

// external modules
const JsonValidator = require("jsonschema").Validator;

/**
 * The JSON validator class.
 */
class Validator {
    /**
     * @description Initializes the JSON validator.
     * @param {Object} params - The constructor parameter.
     * @param {Object} [params.schema] - The object containing
     * a single key-value, where the value is the JSON schema
     * and the key is its assigned name.
     */
    constructor(params) {
        let self = this;
        // save the JSON validator
        self._validator = new JsonValidator();
        // the json schemas used to validate
        self.schemas = params;
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
        return {
            isValid: validation.errors.length === 0,
            errors: validation.errors
        };
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
