// external modules
const rp = require("request-promise-native");
const mime = require("mime-types");

class BasicRESTAPI {
    /**
     * Initializes the API Basic class.
     * @param {Object} [args] - The constructor parameters.
     * @param {Boolean} [args.enabled=false] - If crawling is enabled for the crawling.
     *
     */
    constructor(args = {}) {
        // set crawling status variables
        this._enabled = args.enabled || false;
        // how to process the materials
        this._processCb = args.callback || null;
        // the postgresql object
        this._pg = args.pg || null;
        // the retriever associated token
        this._token = args.token || null;
    }

    start() {
        throw new Error("[BasicAPI start] not implemented");
    }

    stop() {
        throw new Error("[BasicAPI stop] not implemented");
    }

    update() {
        throw new Error("[BasicAPI update] not implemented");
    }

    /**
     * Makes a GET request.
     * @param {String} url - The url to where the GET request is sent.
     * @returns {Promise} The promise of returning the response.
     */
    get(url) {
        // send a request to the API to get the material
        return rp({ method: "GET", url, json: true });
    }

    /**
     * Makes a POST request.
     * @param {String} url - The url where the request is sent.
     * @param {Object} body - The data sent with the post request.
     * @returns {Promise} The promise of returning the response.
     */
    post(url, body) {
        // send a request to the API to get the material
        return rp({
            method: "POST", url, body, json: true
        });
    }

    /**
     * Gets the mimetype using the material URL.
     * @param {String} url - The url to the material.
     * @returns {String} The material mimetype.
     */
    mimetype(url) {
        return mime.lookup(url);
    }

    /**
     * Gets the extension using the material mimetype.
     * @param {String} mimetype - The material mimetype.
     * @returns {String} The material extension.
     */
    extension(mimetype) {
        return mime.extension(mimetype);
    }
}
// exports the BasicRESTAPI class
module.exports = BasicRESTAPI;
