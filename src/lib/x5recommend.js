// external modules
const qm = require("qminer");
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
            dbPath: self.params.path,
            indexCache: 10000,
            storeCache: 10000
        };

        if (self.params.mode === 'create') {
            // open database in create mode - create the database from scratch
            baseParams.mode = 'create';
            baseParams.schema = require('../schemas/base/schema');
        } else if (self.params.mode === 'open') {
            // open database in open mode - allowing records to be pushed to stores
            baseParams.mode = 'open';
        } else if (self.params.mode === 'readOnly') {
            // open database in readOnly mode - don't allow changing store records
            baseParams.mode = 'openReadOnly';
        } else {
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
     * @description Loads the recommendation models.
     * @private
     */
    _loadModels() {
        let self = this;
        // load the nearest neighbor model used for content recommendation
        self.contentNN = new NearestNeighbor({
            mode: 'load',
            base: self.base,
            path: self.params.path + '/contentNN.dat'
        });
    }

    /**
     * @description Create the Nearest Neighbor model for Content store.
     * @private
     */
    _createContentNNModel() {
        let self = this;
        // create the content nearest neighbor model
        self.contentNN = new NearestNeighbor({
            mode: 'create',
            base: self.base,
            modelPath: self.params.path + '/contentNN.dat',
            store: self.content,
            features: [{
                type: "text", source: "Content", field: "title",
                ngrams: 2, hashDimension: 200000
            }, {
                type: "text", source: "Content", field: "description",
                ngrams: 2, hashDimension: 200000
            }]
        });
    }

    /**
     * @description Create the recommendation models.
     */
    createModels() {
        let self = this;
        self._createContentNNModel();
    }

}

module.exports = x5recommend;