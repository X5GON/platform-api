/************************************************
 * The X5GON recommendation class.
 * Contains all of the recommendation models.
 */

// external modules
const path = require('path');
const qm = require('qminer');

// internal modules
const NearestNeighbor = require('./models/nearest-neighbors');
const Logger = require('../lib/utils/logging-handler')();

// create a logger instance for logging recommendation requests
const logger = Logger.createGroupInstance('recommendation-requests', 'x5recommend');

/**
 * The x5recommend class - handling the recommendation requests given by
 * the x5gon project users.
 */
class x5recommend {

    /**
     * @description Creates or loads database used for recommender system.
     * @param {Object} params - The parameter object used for initialization.
     * @param {String} params.mode - The database creation mode. Possible options
     * `create`, `open` and `readOnly`.
     * @param {String} params.path - The path where the database is stored.
     */
    constructor(params) {
        let self = this;
        // parse parameters
        self.params = params;
        // load database
        self._loadBase();

        if (self.params.mode === 'readOnly') {
            // load the recommendation models
            self._loadModels();
        }
    }

    /**
     * @description Loads the database.
     * @private
     */
    _loadBase() {
        let self = this;
        // set the base parameters
        let baseParams = {
            dbPath: path.normalize(self.params.path),
            indexCache: 10000,
            storeCache: 10000
        };

        if (self.params.mode === 'create' || self.params.mode === 'createClean') {
            // open database in create mode - create the database from scratch
            baseParams.mode = self.params.mode;
            baseParams.schema = require(path.join(__dirname, '../schemas/base/schema'));
        } else if (self.params.mode === 'open') {
            // open database in open mode - allowing records to be pushed to stores
            baseParams.mode = 'open';
        } else if (self.params.mode === 'readOnly') {
            // open database in readOnly mode - don't allow changing store records
            baseParams.mode = 'openReadOnly';
        } else {
            // unsupported qminer mode - log the error
            let errorMessage = `Value of parameter 'mode' is not supported: ${self.params.mode}`;
            logger.error(`error [x5recommend._loadBase]: ${errorMessage}`, { error: errorMessage });
            throw errorMessage;
        }

        // create or open the database
        self.base = new qm.Base(baseParams);

        // get and save database store
        self.content = self.base.store('Content');
    }

    /**
     * @description Closes the base.
     */
    close() {
        this.base.close();
    }

    /**
     * @description Adds a new instance to the Content store.
     * @param {Object} record - The record being added to content store.
     */
    pushRecordContent(record) {
        let self = this;
        // TODO: validate record schema
        if (!true /* check record validation */) {
            // record is not in correct format - throw an error
            return new Error('Record not in correct format');
        }

        // push the record to the content store
        self.content.push(record);
        return self.content.length;
    }

    /********************************************
     * Recommendation Models
     *******************************************/

    /**
     * @description Create the Nearest Neighbor model for Content store based on 
     * text.
     * @private
     */
    _createContentTextNNModel() {
        let self = this;
        // create the content nearest neighbor model
        self.contentTextNN = new NearestNeighbor({
            mode: 'create',
            base: self.base,
            modelPath: path.join(self.params.path, '/contentTextNN.dat'),
            store: self.content,
            features: [{
                type: 'text', source: 'Content', field: ['title', 'description'],
                ngrams: 2, hashDimension: 200000
            }]
        });
    }

    /**
     * @description Loads the Nearest Neighbor model for Content store based on 
     * text.
     * @private
     */
    _loadContentTextNNModel() {
        let self = this;
        // load the nearest neighbor model used for content recommendation
        self.contentTextNN = new NearestNeighbor({
            mode: 'load',
            base: self.base,
            modelPath: path.join(self.params.path, '/contentTextNN.dat')
        });
    }


    /**
     * @description Create the Nearest Neighbor model for Content store based on 
     * Wikipedia concepts.
     * @private
     */
    _createContentWikiNNModel() {
        let self = this;
        // create the content nearest neighbor model
        self.contentWikiNN = new NearestNeighbor({
            mode: 'create',
            base: self.base,
            modelPath: path.join(self.params.path, '/contentWikiNN.dat'),
            store: self.content,
            features: [{
                type: 'multinomial', source: { store: "Content", join: "concepts" }, 
                field: 'secUri'
            }]
        });
    }

    /**
     * @description Loads the Nearest Neighbor model for Content store based on 
     * Wikipedia concepts.
     * @private
     */
    _loadContentWikiNNModel() {
        let self = this;
        // load the nearest neighbor model used for content recommendation
        self.contentWikiNN = new NearestNeighbor({
            mode: 'load',
            base: self.base,
            modelPath: path.join(self.params.path, '/contentWikiNN.dat')
        });
    }


    /**
     * @description Create the recommendation models.
     */
    createModels() {
        let self = this;
        self._createContentTextNNModel();
        self._createContentWikiNNModel();

    }

    /**
     * @description Loads the recommendation models.
     * @private
     */
    _loadModels() {
        let self = this;
        self._loadContentTextNNModel();
        self._loadContentWikiNNModel();
    }

    /**
     * Get content based recommendations.
     * @param {Object} queryObject - The object containing the required query parameters.
     * @param {String} [queryObject.text] - The text parameter. Finds material containing similar text.
     * @param {String} [queryObject.url] - The url parameter. Finds the material found using the url and 
     * returns material similar to it.
     * @returns {Array.<Object>} An array of recommended learning material.
     */
    recommendContent(queryObject) {
        let self = this;
        // distinguish between the url and title & description query methods
        let recommendations;

        if (queryObject.url || queryObject.text) {
            // return the recommendation based on the query
            recommendations = self.contentTextNN.search(queryObject, self.content);
        } else {
            let errorMessage = 'Unsupported recommendation parameters';
            logger.error(`error [x5recommend.recommendContent]: ${errorMessage}`, { 
                error: errorMessage, queryObject 
            });
            // not supported query option - return error
            return { error: 'Unsupported recommendation parameters' };
        }

        // return the list of recommended materials with their weights
        return recommendations[0].map((material, id) => {
            return {
                weight: recommendations[1][id],
                link: material.link,
                title: material.title,
                description: material.description,
                provider: material.provider
            };
        });
    }
}
module.exports = x5recommend;