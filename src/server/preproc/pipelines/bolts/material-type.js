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

        if (materialType && materialType.ext && materialType.mime) {
            console.log('Already has type', materialType);
            // material type was already determined
            return this._onEmit(material, stream_id, callback);

        } else if (materialUrl && materialUrl.indexOf('http://') === 0) {
            // make an http request and handle appropriately handle the objects
            return this._makeProtocolRequest(http, material, stream_id, callback);

        } else if (materialUrl && materialUrl.indexOf('https://') === 0) {
            // make an https request and handle appropriately handle the objects
            return this._makeProtocolRequest(https, material, stream_id, callback);

        } else {
            // unable to get format of the material
            material.message = `${this._prefix} No type or valid material URL`;
            return this._onEmit(material, 'stream_partial', callback);
        }
    }


    /**
     * @description Makes an http(s) request and handles the response.
     * @param {Object} protocol - The protocol used to get the material.
     * Must be one of http, https objects.
     * @param {Object} material - The material object. Contains the material attributes.
     * @param {String} stream_id - The QTopology stream id.
     * @param {Function} callback - The callback function provided by qtolopogy.
     */
    _makeProtocolRequest(protocol, material, stream_id, callback) {
        let self = this;

        // make the protocol request and handle the response
        protocol.get(material.materialurl, response => {
            // handle the given response
            this._handleHTTPResponse(response, material, stream_id, callback);
        }).on('error', error => {
            // send formated material to the next component
            material.message = `${self._prefix} Error when making an http request= ${error.message}`;
            return self._onEmit(material, 'stream_partial', callback);
        });
    }


    /**
     * @description Extracts the material type using the response.
     * @param {Object} response - The http(s) response.
     * @param {Object} material - The material object. Contains the material attributes.
     * @param {String} stream_id - The qtopology stream id.
     * @param {Function} callback - The callback function provided by qtopology.
     */
    _handleHTTPResponse(response, material, stream_id, callback) {
        const statusCode = response.statusCode;
        if (statusCode !== 200) {
            // send formated material to the next component
            material.message = `${this._prefix} Error when making a request, invalid status code= ${statusCode}`;
            return this._onEmit(material, 'stream_partial', callback);
        } else {
            response.on('data', () => {
                // get the minimum number of bytes to detect type
                const chunk = response.read(fileType.minimumBytes);
                // destroy the response of the http(s)
                response.destroy();
                // assign the material type
                material.type = fileType(chunk);
                console.log('Updated type', material.type);
                // send formated material to the next component
                return this._onEmit(material, stream_id, callback);
            });
        }
    }

}

exports.create = function (context) {
    return new MaterialFormat(context);
};