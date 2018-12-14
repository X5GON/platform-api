/********************************************************************
 * Material: Type
 * This component extracts the material type using the material
 * origin url and assigns an object containing the extention and
 * mimetype of the material.
 */

// external libraries
const http = require('http');
const https = require('https');
const fileType = require('file-type');

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
        // get the material url and type
        const materialUrl = material.materialurl;
        const materialType = material.type;

        if (materialType && materialType.ext && materialType.mimetype) {
            // send formated material to the next component
            return this._onEmit(material, stream_id, callback);

        } else if (materialUrl.indexOf('http://') === 0) {
            // make a http request and retrieve material type
            http.get(materialUrl, response => {
                this._handleResponse(response, material, stream_id, callback);
            });
        } else if (materialUrl.indexOf('https://') === 0) {
            // make a https request and retrieve material type
            https.get(materialUrl, response => {
                this._handleResponse(response, material, stream_id, callback);
            });
        } else {
            // unable to get format of the material - send to partial table
            material.message = `${this._prefix} No type or valid material url`;
            return this._onEmit(material, 'stream_partial', callback);
        }
    }

    /**
     * @description Extracts the material type using the response.
     * @param {Object} response - The http(s) response.
     * @param {Object} material - The material object.
     * @param {String} stream_id - The stream id.
     * @param {Function} callback - The callback function.
     */
    _handleResponse(response, material, stream_id, callback) {
        if (response.statusCode !== 200) {
            // send formated material to the next component
            material.message = `${this._prefix} Error when making a request`;
            return this._onEmit(material, 'stream_partial', callback);
        } else {
            response.on('data', chunk => {
                // destroy the response of the http(s)
                response.destroy();
                // assign the material type
                material.type = fileType(chunk);
                // send formated material to the next component
                return this._onEmit(material, stream_id, callback);
            });
        }
    }

}

exports.create = function (context) {
    return new MaterialFormat(context);
};