/********************************************************************
 * Material Format Component
 * This component receives the OER material in its raw form and it
 * formats into a common schema.
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
        // get material attributes
        const {
            title,
            description,
            providerUri,
            materialUrl,
            author,
            language,
            type,
            dateCreated,
            dateRetrieved,
            providerMetadata } = material;

        // create the object containing the material format
        const formattedMaterial = {
            title,
            description,
            providerUri,
            materialUrl,
            author,
            language,
            type,
            dateCreated,
            dateRetrieved,
            providerMetadata,
            materialMetadata: { }
        };

        if (formattedMaterial.type) {
            // send formated material to the next component
            return this._onEmit(formattedMaterial, stream_id, callback);

        } else if (material.materialUrl.indexOf('http://') === 0) {
            // make a http request and retrieve material type
            http.get(material.materialUrl, response => {
                this._handleResponse(response, formattedMaterial, stream_id, callback);
            });

        } else if (material.materialUrl.indexOf('https://') === 0) {
            // make a https request and retrieve material type
            https.get(material.materialUrl, response => {
                this._handleResponse(response, formattedMaterial, stream_id, callback);
            });

        } else {
            // unable to get format of the material - send to partial table
            return this._onEmit(formattedMaterial, 'stream_partial', callback);
        }
    }

    _handleResponse(response, material, stream_id, callback) {
        if (response.statusCode !== 200) {
            // send formated material to the next component
            return this._onEmit(material, stream_id, callback);
        } else {
            response.on('data', chunk => {
                response.destroy();
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