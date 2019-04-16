/********************************************************************
 * Material: Type
 * This component extracts the material type using the material
 * origin url and assigns an object containing the extention and
 * mimetype of the material.
 */

// external libraries
const http = require('http');
const https = require('https');
// file type detection/extraction libraries
const fileTypeManual   = require('mime-types');
const fileTypeResponse = require('file-type');

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
            // material type was already determined
            return this._onEmit(material, stream_id, callback);

        } else if (materialUrl) {
            // get the extension of the material
            const splitUrl = materialUrl.split('.');
            const ext = splitUrl[splitUrl.length - 1].toLowerCase();
            // get the mimetype from the extension
            const mime = fileTypeManual.lookup(ext);

            if (mime) {
                // was able to extract a valid mimetype from the extension
                material.type = { ext, mime };
                // the mimetype has been extracted from the extension
                return this._onEmit(material, stream_id, callback);

            } else if (materialUrl.indexOf('http://') === 0) {
                // make an http request and handle appropriately handle the objects
                return this._makeProtocolRequest(http, material, stream_id, callback);

            } else if (materialUrl.indexOf('https://') === 0) {
                // make an https request and handle appropriately handle the objects
                return this._makeProtocolRequest(https, material, stream_id, callback);
            } else {
                // cannot detect the protocol for getting materials
                material.message = `${this._profix} Cannot detect protocol for getting materials`;
                return this._onEmit(material, 'stream_partial', callback);
            }
        } else {
            // unable to get the url of the material
            material.message = `${this._prefix} No material url provided`;
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
            material.message = `${self._prefix} Error when making an http(s) request= ${error.message}`;
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
                const chunk = response.read(fileTypeResponse.minimumBytes);
                // destroy the response of the http(s)
                response.destroy();
                // assign the material type
                material.type = fileTypeResponse(chunk);
                // send formated material to the next component
                return this._onEmit(material, stream_id, callback);
            });
        }
    }

}

exports.create = function (context) {
    return new MaterialFormat(context);
};