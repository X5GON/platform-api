// external modules
const request = require('request');

class BasicAPI {

    /**
     * Initializes the API Basic class.
     * @param {Object} [args] - The constructor parameters.
     * @param {String|null} [args.apikey=null] - The key used to make the request.
     * @param {String|null} [args.domain=null] - The domain where the request is sent.
     * @param {Boolean} [args.crawlingEnabled=false] - If crawling is enabled for the crawling.
     * @param {Object|null} [args.crawlingInterval=null] - The crawling interval object.
     */
    constructor(args = {}) {
        this.apikey = args.apikey || null;
        this.domain = args.domain || null;
        // set crawling status variables
        this._crawlingEnabled = args.crawlingEnabled || false;
        this._crawlingInterval = args.crawlingInterval || null;
        this._crawlingFrequency = args.crawlingFrequency || Infinity;

    }

    /**
     * Makes a GET request.
     * @param {String} url - The url to where the GET request is sent.
     * @returns {Promise} The promise of returning the response.
     */
    get(url) {
        // send a request to the API to get the material
        return new Promise((resolve, reject) => {
            request(url, (error, httpRequest, body) => {
                if (error) { return reject(error); }
                try {
                    return resolve(JSON.parse(body));
                } catch (xerror) {
                    return reject(xerror);
                }
            });
        });
    }

    /**
     * Makes a POST request.
     * @param {Object} options - The options used to make a post request.
     * @param {String} options.url - The url where the request is sent.
     * @param {Object} options.form - The data sent with the post request.
     * @returns {Promise} The promise of returning the response.
     */
    post(options) {
        // send a request to the API to get the material
        return new Promise((resolve, reject) => {
            request.post(options, (error, httpRequest, body) => {
                if (error) { return reject(error); }
                try {
                    return resolve(JSON.parse(body));
                } catch (xerror) {
                    return reject(xerror);
                }
            });
        });
    }

}
// exports the BasicAPI class
module.exports = BasicAPI;