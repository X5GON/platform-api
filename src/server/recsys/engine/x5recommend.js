/************************************************
 * The X5GON recommendation class.
 * Contains all of the recommendation models.
 */

const config = require('@config/config');
const mimetypes = require('@config/mimetypes');

// external modules
const path = require('path');
const fs = require('fs');
const qm = require('qminer');

// internal modules
const NearestNeighbor = require('./models/nearest-neighbors');
const Logger = require('@lib/logger');
const pg = require('@lib/postgresQL')(config.pg);

const { environment } = config;

/**
 * @class x5recommend
 * @classdesc The x5recommend class - handling the recommendation requests given by
 * the x5gon project users.mimetypes
 */
class x5recommend {

    /**
     * @description Creates or loads database used for recommender system.
     * @param {Object} params - The parameter object used for initialization.
     * @param {String} params.mode - The database creation mode. Possible options
     * `create`, `open` and `readOnly`.
     * @param {String} params.path - The path where the database is stored.
     * @param {String} [params.env='production'] - The environment in which it is initialized.
     * Possible options `production` and `text`.
     */
    constructor(params) {
        let self = this;
        // parse parameters
        self.params = params;
        if (!self.params.env) { self.params.env = 'production'; }
        // set the recommender requests logger
        self.logger = Logger.createGroupInstance(`recommendation-requests-${self.params.env}`,
            'x5recommend', environment === 'dev');

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
            baseParams.schema = require(path.join(__dirname, '../schemas/schema'));
        } else if (self.params.mode === 'open') {
            // open database in open mode - allowing records to be pushed to stores
            baseParams.mode = 'open';
        } else if (self.params.mode === 'readOnly') {
            // open database in readOnly mode - don't allow changing store records
            baseParams.mode = 'openReadOnly';
            // remove the lock file if present
            const lockPath = path.normalize(path.join(self.params.path, 'lock'));
            if (fs.existsSync(lockPath)) {
                fs.unlinkSync(lockPath);
            }
        } else {
            // unsupported qminer mode - log the error
            let errorMessage = `Value of parameter 'mode' is not supported: ${self.params.mode}`;
            self.logger.error(`error [x5recommend._loadBase]: ${errorMessage}`, { error: errorMessage });
            throw Error(errorMessage);
        }

        // create or open the database
        self.base = new qm.Base(baseParams);

        // get and save database store
        self.content = self.base.store('Content');
        self.materialModel = self.base.store('MaterialModel');
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

    /**
     * @description Adds a new instance to the MaterialModel store.
     * @param {Object} record - The record being added to material model store.
     */
    pushRecordMaterialModel(record) {
        let self = this;
        // TODO: validate record schema
        if (!true /* check record validation */) {
            // record is not in correct format - throw an error
            return new Error('Record not in correct format');
        }

        // push the record to the content store
        self.materialModel.push(record);
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
                type: 'text', source: 'Content', field: ['title', 'description', 'rawContent'],
                ngrams: 2, hashDimension: 20000
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
            store: self.content,
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
                type: 'multinomial', source: 'Content',
                field: 'wikipediaConceptNames'
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
            store: self.content,
            modelPath: path.join(self.params.path, '/contentWikiNN.dat'),
        });
    }

    /**
     * @description Create the Nearest Neighbor model for Content store based on
     * Wikipedia concept consine metrics.
     * @private
     */
    _createContentWikiSupportNNModel() {
        let self = this;
        // create the content nearest neighbor model
        self.contentWikiSupportNN = new NearestNeighbor({
            mode: 'create',
            base: self.base,
            modelPath: path.join(self.params.path, '/contentWikiSupportNN.dat'),
            store: self.content,
            features: [{
                type: 'multinomial', source: 'Content',
                field: 'wikipediaConceptNames',
                valueField: 'wikipediaConceptSupport'
            }]
        });
    }

    /**
     * @description Loads the Nearest Neighbor model for Content store based on
     * Wikipedia concept consine metrics.
     * @private
     */
    _loadContentWikiSupportNNModel() {
        let self = this;
        // load the nearest neighbor model used for content recommendation
        self.contentWikiSupportNN = new NearestNeighbor({
            mode: 'load',
            base: self.base,
            store: self.content,
            modelPath: path.join(self.params.path, '/contentWikiSupportNN.dat')
        });
    }

        /**
     * @description Create the Nearest Neighbor model for MaterialModel store based on
     * Wikipedia concept support metrics.
     * @private
     */
    _createUserMaterialSimNNModel() {
        let self = this;
        // create the content nearest neighbor model
        self.userMaterialSimNN = new NearestNeighbor({
            mode: 'create',
            base: self.base,
            modelPath: path.join(self.params.path, '/userMaterialSimNN.dat'),
            store: self.materialModel,
            features: [{
                type: 'multinomial', source: 'MaterialModel',
                field: 'wikipediaConceptNames',
                valueField: 'wikipediaConceptSupport'
            }]
        });
    }

    /**
     * @description Loads the Nearest Neighbor model for MaterialModel store based on
     * Wikipedia concept support metrics.
     * @private
     */
    _loadUserMaterialSimNNModel() {
        let self = this;
        // load the nearest neighbor model used for content recommendation
        self.userMaterialSimNN = new NearestNeighbor({
            mode: 'load',
            base: self.base,
            store: self.materialModel,
            modelPath: path.join(self.params.path, '/userMaterialSimNN.dat')
        });
    }

    /**
     * @description Create the recommendation models.
     */
    createModels() {
        let self = this;
        self._createContentTextNNModel();
        self._createContentWikiNNModel();
        self._createContentWikiSupportNNModel();
        self._createUserMaterialSimNNModel();
    }

    /**
     * @description Loads the recommendation models.
     * @private
     */
    _loadModels() {
        let self = this;
        self._loadContentTextNNModel();
        self._loadContentWikiNNModel();
        self._loadContentWikiSupportNNModel();
        self._loadUserMaterialSimNNModel();
    }

    /********************************************
     * Content Recommendation Functions
     *******************************************/

    /**
     * @description Get content based recommendations.
     * @param {Object} userQuery - The object containing the required query parameters.
     * @param {String} [userQuery.text] - The text parameter. Finds material containing similar text.
     * @param {String} [userQuery.url] - The url parameter. Finds the material found using the url and
     * returns material similar to it.
     * @param {String} [userQuery.type] - The metrics type.
     * @returns {Array.<Object>} An array of recommended learning material.
     */
    recommendMaterials(userQuery) {
        let self = this;

        // distinguish between the url and title & description query methods
        if (!userQuery) {
            let errorMessage = 'Missing query';
            self.logger.error(`error [x5recommend.recommendMaterials]: ${errorMessage}`, {
                error: errorMessage, query: userQuery
            });
            // not supported query option - return error
            return Promise.reject({ error: errorMessage });
        }

        const {
            url,
            text,
            type,
            count
        } = userQuery;

        // if none of the parameters are provided
        if (!url && !text) {
            // log the error for unsupported parameters
            let errorMessage = 'Unsupported recommendation parameters';
            self.logger.error(`error [x5recommend.recommendMaterials]: ${errorMessage}`, {
                error: errorMessage, query: userQuery
            });
            // not supported query option - return error
            return Promise.reject({ error: errorMessage });
        }

        // get the model of the respected type
        let model,
            query;
        if (url && (self.content.recordByName(url) || !text)) {
            // decide on the model
            model = type === 'support' ?
                self.contentWikiSupportNN :
                self.contentWikiNN;
            // setup the query
            query = { url, type };
        } else if (text) {
            model = self.contentTextNN;
            query = { text, type };
        }

        const maxCount = count ? count : 20;
        // get material recommendations
        let recommendations = model.search(query, maxCount);

        if (!recommendations) {
            let errorMessage = 'Empty query object';
            self.logger.error(`error [x5recommend.recommendMaterials]: ${errorMessage}`, {
                error: errorMessage, query: userQuery
            });
            // not supported query option - return error
            return Promise.reject({ error: errorMessage });

        } else if (recommendations.error) {
            // log the error given by the recommendation search
            self.logger.error(`error [x5recommend.recommendMaterials]: ${recommendations.error}`, {
                error: recommendations.error, query: userQuery
            });
            // not supported query option - return error
            return Promise.reject({ error: recommendations.error });
        }

        return Promise.resolve(recommendations);
    }


    /**
     * @description Get bundle based recommendations.
     * @param {Object} userQuery - The object containing the required query parameters.
     * @param {String} [userQuery.text] - The text parameter. Finds material containing similar text.
     * @param {String} [userQuery.url] - The url parameter. Finds the material found using the url and
     * returns material similar to it.
     * @param {String} [userQuery.type] - The metrics type.
     * @param {String} [userQuery.count] - The number of recommendations to provide.
     * @returns {Array.<Object>} An array of recommended learning material.
     */
    recommendBundles(userQuery) {
        let self = this;

        // distinguish between the url and title & description query methods
        if (!userQuery) {
            let errorMessage = 'Missing query';
            self.logger.error(`error [x5recommend.recommendContent]: ${errorMessage}`, {
                error: errorMessage, query: userQuery
            });
            // not supported query option - return error
            return Promise.reject({ error: errorMessage });
        }

        const {
            url,
            text,
            type,
            count
        } = userQuery;

        let model,
            query;
        // get the model of the respected type
        if (url && (self.materialModel.recordByName(url) || !text)) {
            // decide on the model
            model = self.userMaterialSimNN;
            // setup the query
            query = { url, type };
        } else if (text) {
            model = self.contentTextNN;
            query = { text, type };
        } else {
            // log the error for unsupported parameters
            let errorMessage = 'Unsupported recommendation parameters';
            self.logger.error(`error [x5recommend.recommendContent]: ${errorMessage}`, {
                error: errorMessage, query: userQuery
            });
            // not supported query option - return error
            return Promise.reject({ error: errorMessage });
        }

        const maxCount = count ? count : 20;
        // get material recommendations
        let recommendations = model.search(query, maxCount);

        if (!recommendations) {
            let errorMessage = 'Empty query object';
            self.logger.error(`error [x5recommend.recommendContent]: ${errorMessage}`, {
                error: errorMessage, query: userQuery
            });
            // not supported query option - return error
            return Promise.reject({ error: errorMessage });

        } else if (recommendations.error) {
            // log the error given by the recommendation search
            self.logger.error(`error [x5recommend.recommendContent]: ${recommendations.error}`, {
                error: recommendations.error, query: userQuery
            });
            // not supported query option - return error
            return Promise.reject({ error: errorMessage });
        }

        return Promise.resolve(recommendations);
    }


    /********************************************
     * Personalized Recommendation Functions
     ********************************************/

    /**
      * @description Get content based recommendations.
      * @param {Object} query - The object containing the required query parameters.
      * @param {String} [query.text] - The text parameter. Finds material containing similar text.
      * @param {String} [query.url] - The url parameter. Finds the material found using the url and
      * returns material similar to it.
      * @param {String} [query.type] - The metrics type.
      * @returns {Array.<Object>} An array of recommended learning material.
      */
    recommendPersonalized(query) {
        let self = this;

        return new Promise(function (resolve, reject) {
            if (!query) {
                let errorMessage = 'recommendPersonalized: Missing query';
                self.logger.error(`error [x5recommend.recommendContent]: ${errorMessage}`, {
                    error: errorMessage, query
                });
                // not supported query option - return error
                return reject({ error: errorMessage });
            }

            pg.select({ uuid: query.uuid }, 'rec_sys_user_model', function(error, results) {
                if (error) {
                    self.logger.error('Error fetching user model: ' + error);
                    return reject(error);
                }

                if (!results || results.length === 0) {
                    return reject({ error: 'Cookie is not in the database - unable to fetch the user' });
                }

                results = results[0];
                let wikipediaConceptNames = [];
                let wikipediaConceptSupport = [];

                for (let concept in results.concepts) {
                    wikipediaConceptNames.push(concept);
                    wikipediaConceptSupport.push(results.concepts[concept]);
                }

                query = {
                    uuid: results.uuid,
                    wikipediaConceptNames: wikipediaConceptNames,
                    wikipediaConceptSupport: wikipediaConceptSupport
                };

                let recommendations = self.userMaterialSimNN.search(query);

                if (!recommendations) {
                    recommendations = {
                        error: 'Error fetching recommendations'
                    };
                    return reject(recommendations);
                }

                // format recommendations
                recommendations = recommendations[0].map((material, id) =>
                    self._materialFormat(material, recommendations[1][id])
                );

                return resolve(recommendations);
            });
        });

    }

    /********************************************
     * General Interface for Recommendations
     *******************************************/

    /**
     * Get recommendations.
     * @param {Object} query - The object containing the query parameters. Query parameters
     * depend on the type of recommendation.
     * @returns {Array.<Object>} An array of recommended learning material.
     */

    recommend(query, type='materials') {
        const self = this;

        let recommendations;
        if (type === 'materials') {
            recommendations = self.recommendMaterials(query);
        } else if (type === 'bundle') {
            recommendations = self.recommendBundles(query);
        } else if (type === 'personal') {
            recommendations = self.recommendPersonalized(query);
        } else {
            recommendations = Promise.resolve([[],[]]);
        }

        // return an object
        return recommendations.then(results => {
            if (results.error) {
                return results;
            }

            // return the list of recommended materials with their weights
            return results[0].map((material, id) =>
                self._materialFormat(material, results[1][id])
            );
        });

    }


    /********************************************
     * Helper Functions
     ********************************************/

    /**
     * Detects the type of the material.
     * @param {String} mimetype - The mimetype of the material.
     * @returns {String} The type of the material.
     */
    _detectType(mimetype) {
        // iterate through mimetypes
        for (let type in mimetypes) {
            if (mimetypes[type].includes(mimetype)) {
                return type;
            }
        }
        // there was no type detected
        return null;
    }


    /**
     * Formats the materials.
     * @param {Object} params - An object containing material metadata.
     * @param {Number} weight - The indicator of relevance.
     */
    _materialFormat(material, weight) {
        let self = this;

        const {
            url,
            title,
            description,
            provider,
            language,
            mimetype,
            wikipediaConceptNames,
            wikipediaConceptSupport
        } = material;

        // get the top 3 wikipedia concepts
        let sort = wikipediaConceptSupport.sortPerm(false);
        const maxCount = 3 > sort.perm.length ? sort.perm.length : 3;
        // store wikipedia names
        let wikipedia = [];
        for (let i = 0; i < maxCount; i++) {
            let maxId = sort.perm[i];
            wikipedia.push({
                concept: wikipediaConceptNames[maxId],
                support: wikipediaConceptSupport[maxId]
            });
        }

        // format the material
        return {
            weight,
            url,
            title,
            description,
            provider,
            language,
            wikipedia,
            type: self._detectType(mimetype)
        };
    }


}
module.exports = x5recommend;