// external modules
const rp = require('request-promise-native');

class BasicRESTAPI {

    /**
     * Initializes the API Basic class.
     * @param {Object} [args] - The constructor parameters.
     * @param {Boolean} [args.enabled=false] - If crawling is enabled for the crawling.
     * @param {Object|null} [args.interval=null] - The crawling interval object.
     * @param {Number} [args.frequency=Infinity] - The crawling frequency.
     *
     */
    constructor(args = {}) {
        // set crawling status variables
        this._enabled = args.enabled || false;
        this._interval = args.interval || null;
        this._frequency = args.frequency || Infinity;
        // how to process the materials
        this._processCb = args.callback || null;
        // the postgresql object
        this._pg = args.pg || null;
    }

    start() {
        throw new Error('[BasicAPI start] not implemented');
    }

    stop() {
        throw new Error('[BasicAPI stop] not implemented');
    }

    update() {
        throw new Error('[BasicAPI update] not implemented');
    }

    /**
     * Makes a GET request.
     * @param {String} url - The url to where the GET request is sent.
     * @returns {Promise} The promise of returning the response.
     */
    get(url) {
        // send a request to the API to get the material
        return rp({ method: 'GET', url, json: true });
    }

    /**
     * Makes a POST request.
     * @param {String} url - The url where the request is sent.
     * @param {Object} body - The data sent with the post request.
     * @returns {Promise} The promise of returning the response.
     */
    post(url, body) {
        // send a request to the API to get the material
        return rp({ method: 'POST', url, body, json: true });
    }
}
// exports the BasicRESTAPI class
module.exports = BasicRESTAPI;