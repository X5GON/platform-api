/** **********************************************
 * The X5GON recommendation class.
 * Contains all of the recommendation models.
 */

// configurations and mimetypes
const config = require("@config/config");
const mimetypes = require("@config/mimetypes");

// external modules
const path = require("path");
const fs = require("fs");
const qm = require("qminer");

// internal modules
const NearestNeighbor = require("./models/nearest-neighbors");
const Logger = require("@library/logger");

// postgresql connections
const pg = require("@library/postgresQL")(config.pg);


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
        // set the recommender requests logger
        self.logger = Logger.createGroupInstance("recommendation", "x5recommend",
            config.isProduction);

        // load database
        self._loadBase();

        if (self.params.mode === "readOnly") {
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

        if (self.params.mode === "create" || self.params.mode === "createClean") {
            // open database in create mode - create the database from scratch
            baseParams.mode = self.params.mode;
            baseParams.schema = require(path.join(__dirname, "../schemas/schema"));
        } else if (self.params.mode === "open") {
            // open database in open mode - allowing records to be pushed to stores
            baseParams.mode = "open";
        } else if (self.params.mode === "readOnly") {
            // open database in readOnly mode - don't allow changing store records
            baseParams.mode = "openReadOnly";
            // remove the lock file if present
            const lockPath = path.normalize(path.join(self.params.path, "lock"));
            if (fs.existsSync(lockPath)) {
                fs.unlinkSync(lockPath);
            }
        } else {
            // unsupported qminer mode - log the error
            let errorMessage = `Value of parameter 'mode' is not supported: ${self.params.mode}`;
            self.logger.error("[error] x5recommend._loadBase", {
                error: errorMessage
            });
            throw Error(errorMessage);
        }

        // create or open the database
        self.base = new qm.Base(baseParams);

        // get and save database store
        self.content = self.base.store("Content");
        self.materialModel = self.base.store("MaterialModel");
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

        // TODO: validate record schema programmatically
        function validateRecordSchema(record) {
            if (!record.url) {
                return false;
            }
            if (!record.title) {
                return false;
            }
            if (!record.provider) {
                return false;
            }
            if (!record.language) {
                return false;
            }
            return true;
        }
        if (!validateRecordSchema(record) /* check record validation */) {
            // log the difference in schemas
            self.logger.warn("[warn] x5recommend.pushRecordContent", {
                error: { message: "record is not in correct format" },
                record
            });
            // record is not in correct format - throw an error
            return new Error("Record not in correct format");
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
        function validateRecordSchema(record) {
            if (!record.url) {
                return false;
            }
            if (!record.title) {
                return false;
            }
            if (!record.provider) {
                return false;
            }
            if (!record.language) {
                return false;
            }
            return true;
        }
        if (!validateRecordSchema(record) /* check record validation */) {
            // log the difference in schemas
            self.logger.warn("[warn] x5recommend.pushRecordMaterialModel", {
                error: { message: "record is not in correct format" },
                record
            });
            // record is not in correct format - throw an error
            return new Error("Record not in correct format");
        }

        // push the record to the content store
        self.materialModel.push(record);
        return self.content.length;
    }

    /** ******************************************
     * Recommendation Models
     ****************************************** */

    /**
     * @description Create the Nearest Neighbor model for Content store based on
     * text.
     * @private
     */
    _createContentTextNNModel() {
        let self = this;
        // create the content nearest neighbor model
        self.contentTextNN = new NearestNeighbor({
            mode: "create",
            base: self.base,
            modelPath: path.join(self.params.path, "/contentTextNN.dat"),
            store: self.content,
            features: [{
                type: "text",
                source: "Content",
                field: ["title", "description", "rawContent"],
                ngrams: 2,
                hashDimension: 20000
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
            mode: "load",
            base: self.base,
            store: self.content,
            modelPath: path.join(self.params.path, "/contentTextNN.dat")
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
            mode: "create",
            base: self.base,
            modelPath: path.join(self.params.path, "/contentWikiNN.dat"),
            store: self.content,
            features: [{
                type: "multinomial",
                source: "Content",
                field: "wikipediaConceptNames"
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
            mode: "load",
            base: self.base,
            store: self.content,
            modelPath: path.join(self.params.path, "/contentWikiNN.dat"),
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
            mode: "create",
            base: self.base,
            modelPath: path.join(self.params.path, "/contentWikiSupportNN.dat"),
            store: self.content,
            features: [{
                type: "multinomial",
                source: "Content",
                field: "wikipediaConceptNames",
                valueField: "wikipediaConceptSupport"
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
            mode: "load",
            base: self.base,
            store: self.content,
            modelPath: path.join(self.params.path, "/contentWikiSupportNN.dat")
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
            mode: "create",
            base: self.base,
            modelPath: path.join(self.params.path, "/userMaterialSimNN.dat"),
            store: self.materialModel,
            features: [{
                type: "multinomial",
                source: "MaterialModel",
                field: "wikipediaConceptNames",
                valueField: "wikipediaConceptSupport"
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
            mode: "load",
            base: self.base,
            store: self.materialModel,
            modelPath: path.join(self.params.path, "/userMaterialSimNN.dat")
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

    /** ******************************************
     * Content Recommendation Functions
     ****************************************** */

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
            let errorMessage = "Missing query";
            self.logger.error("[error] x5recommend.recommendMaterials", {
                error: { message: errorMessage },
                query: userQuery
            });
            // not supported query option - return error
            return Promise.reject(new Error(errorMessage));
        }

        const {
            material_id,
            url,
            text,
            type,
            count
        } = userQuery;

        // if none of the parameters are provided
        if (!material_id && !url && !text) {
            // log the error for unsupported parameters
            let errorMessage = "Unsupported recommendation parameters";
            self.logger.error("[error] x5recommend.recommendMaterials", {
                error: { message: errorMessage },
                query: userQuery
            });
            // not supported query option - return error
            return Promise.reject(new Error(errorMessage));
        }

        // get the model of the respected type
        let model;
        let query;
        let recommendations;

        const maxCount = count || 20;

        if (material_id) {
            // decide on the model
            model = type === "support"
                ? self.contentWikiSupportNN
                : self.contentWikiNN;
            // setup the query
            query = { material_id, type };
            recommendations = model.search(query, maxCount, 100, 10);
        } else if (url && (self.content.recordByName(url) || !text)) {
            // decide on the model
            model = type === "support"
                ? self.contentWikiSupportNN
                : self.contentWikiNN;
            // setup the query
            query = { url, type };
            recommendations = model.search(query, maxCount, 0.95);
        } else if (text) {
            model = self.contentTextNN;
            query = { text, type };
            recommendations = model.search(query, maxCount);
        }

        if (!recommendations) {
            let errorMessage = "Empty query object";
            self.logger.warn("[warn] x5recommend.recommendMaterials", {
                error: { message: errorMessage },
                query: userQuery
            });
            // not supported query option - return error
            return Promise.reject(new Error(errorMessage));
        } else if (recommendations.error) {
            // log the error given by the recommendation search
            self.logger.warn("[warn] x5recommend.recommendMaterials", {
                error: { message: recommendations.error },
                query: userQuery
            });
            // not supported query option - return error
            return Promise.reject(new Error(recommendations.error));
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
            let errorMessage = "Missing query";
            self.logger.error("[error] x5recommend.recommendBundles", {
                error: { message: errorMessage },
                query: userQuery
            });
            // not supported query option - return error
            return Promise.reject(new Error(errorMessage));
        }

        const {
            url,
            text,
            type,
            count
        } = userQuery;

        let model;
        let query;
        let recommendations;

        const maxCount = count || 20;

        // get the model of the respected type
        if (url && (self.materialModel.recordByName(url) || !text)) {
            // decide on the model
            model = self.userMaterialSimNN;
            // setup the query
            query = { url, type };
            recommendations = model.search(query, maxCount, 0.95);
        } else if (text) {
            model = self.contentTextNN;
            query = { text, type };
            recommendations = model.search(query, maxCount);
        } else {
            // log the error for unsupported parameters
            let errorMessage = "Unsupported recommendation parameters";
            self.logger.error("[error] x5recommend.recommendBundles", {
                error: { message: errorMessage },
                query: userQuery
            });
            // not supported query option - return error
            return Promise.reject(new Error(errorMessage));
        }

        if (!recommendations) {
            let errorMessage = "Empty query object";
            self.logger.warn("[warn] x5recommend.recommendBundles", {
                error: { message: errorMessage },
                query: userQuery
            });
            // not supported query option - return error
            return Promise.reject(new Error(errorMessage));
        } else if (recommendations.error) {
            // log the error given by the recommendation search
            self.logger.warn("[warn] x5recommend.recommendBundles", {
                error: { message: recommendations.error },
                query: userQuery
            });
            // not supported query option - return error
            return Promise.reject(new Error(recommendations.error));
        }

        return Promise.resolve(recommendations);
    }


    /** ******************************************
     * Personalized Recommendation Functions
     ******************************************* */

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

        return new Promise(((resolve, reject) => {
            if (!query) {
                let errorMessage = "Missing query";
                self.logger.error("[error] x5recommend.recommendPersonalized", {
                    error: { message: errorMessage },
                    query
                });
                // not supported query option - return error
                return reject(new Error(errorMessage));
            }

            pg.select({ uuid: query.uuid }, "rec_sys_user_model", (error, results) => {
                if (error) {
                    self.logger.error("[error] x5recommend.recommendPersonalized", {
                        error: { message: error.message, stack: error.stack },
                        query
                    });
                    return reject(error);
                }

                if (!results || results.length === 0) {
                    self.logger.warn("[warn] x5recommend.recommendPersonalized", {
                        error: { message: "cookie not available in the database" },
                        query
                    });
                    return reject(new Error("Cookie is not in the database - unable to fetch the user"));
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
                    wikipediaConceptNames,
                    wikipediaConceptSupport
                };

                const maxCount = query.count ? query.count : 20;

                let recommendations = self.userMaterialSimNN.search(query, maxCount);

                if (!recommendations) {
                    self.logger.warn("[warn] x5recommend.recommendPersonalized", {
                        error: { message: "no recommendations acquired" },
                        query
                    });
                    return reject(new Error("Error fetching recommendations"));
                }

                return resolve(recommendations);
            });
        }));
    }

    /** ****************************************************
      * Collaborative Filtering Recommendation Functions
      **************************************************** */

    /**
      * @description Get content based recommendations.
      * @param {Object} query - The object containing the required query parameters.
      * @param {String} [query.uuid] - The uuid parameter. Finds material most similar to the
      * material the user already accessed.
      * @param {String} [query.text] - The text parameter. Finds material containing similar text.
      * @param {String} [query.url] - The url parameter. Finds the material found using the url and
      * returns material similar to it.
      * @param {String} [query.type] - The metrics type.
      * @returns {Array.<Object>} An array of recommended learning material.
      */
    recommendCollaborativeFiltering(userQuery) {
        let self = this;
        let recommendations;

        let count = userQuery.count ? userQuery.count : 20;

        return new Promise(((resolve, reject) => {
            if (!userQuery) {
                let errorMessage = "recommendPersonalized: Missing query";
                self.logger.error(`error [x5recommend.recommendContent]: ${errorMessage}`, {
                    error: errorMessage, userQuery
                });
                // not supported query option - return error
                reject(new Error(errorMessage));
                return;
            }

            let queryPG = `
            WITH url_count AS (
                SELECT url_id, COUNT(url_id) AS count FROM user_activities WHERE cookie_id IN (
                    SELECT cookie_id FROM user_activities
                    WHERE cookie_id<>1 AND cookie_id NOT IN
                        (SELECT id FROM cookies WHERE uuid = '${userQuery.uuid}')
                        AND url_id IN (
                            SELECT url_id FROM user_activities
                            WHERE cookie_id IN
                            (SELECT id FROM cookies WHERE uuid = '${userQuery.uuid}')
                        )
                )
                GROUP BY url_id ORDER BY count DESC
            )
            SELECT url_count.*, rsmm.* FROM url_count, rec_sys_material_model AS rsmm WHERE url_count.url_id = rsmm.url_id ORDER BY count DESC LIMIT ${count};`;

            pg.execute(queryPG, [], (err, res) => {
                if (err) {
                    self.logger.error(`"Error fetching collaborative filtering recommendations from database: ${err}`);
                    reject(new Error("Error fetching collaborative filtering recommendations from database"));
                    return;
                }

                if (!res || res.length == 0) {
                    reject(new Error("Cookie is not in the database - unable to fetch the collaborative filtering recommendations."));
                    return;
                }

                let materials = [];
                let weights = [];

                /**
                * Detects the type of the material.
                * @param {String} mimetype - The mimetype of the material.
                * @returns {String} The type of the material.
                */

                function detectType(mimetype) {
                    let mime = mimetype.split("/");
                    if (mime[0] === "video") {
                        return "video";
                    } else {
                        return "text";
                    }
                }

                for (let material of res) {
                    let wikipediaConceptNames = [];
                    let wikipediaConceptSupport = [];
                    for (let concept in material.concepts) {
                        wikipediaConceptNames.push(concept);
                        wikipediaConceptSupport.push(material.concepts[concept]);
                    }

                    let item = {
                        url: material.provider_uri,
                        title: material.title,
                        description: material.description,
                        provider: material.provider,
                        language: material.language,
                        type: detectType(material.type),
                        mimetype: material.type,
                        wikipediaConceptNames: new qm.la.StrVector(wikipediaConceptNames),
                        wikipediaConceptSupport: new qm.la.Vector(wikipediaConceptSupport)
                    };
                    materials.push(item);
                    weights.push(material.count);
                }

                recommendations = [materials, weights];

                if (!recommendations) {
                    let errorMessage = "Error fetching collaborative filtering recommendations";
                    self.logger.warn("[warn] x5recommend.recommendMaterials", {
                        error: { message: errorMessage },
                        query: userQuery
                    });
                    // not supported query option - return error
                    return reject(new Error(errorMessage));
                } else if (recommendations.error) {
                    // log the error given by the recommendation search
                    self.logger.warn("[warn] x5recommend.recommendCollaborativeFiltering", {
                        error: { message: recommendations.error },
                        query: userQuery
                    });
                    // not supported query option - return error
                    return reject(new Error(recommendations.error));
                }

                return resolve(recommendations);
            });
        }));
    }

    /** ******************************************
     * General Interface for Recommendations
     ****************************************** */

    /**
     * Get recommendations.
     * @param {Object} query - The object containing the query parameters. Query parameters
     * depend on the type of recommendation.
     * @returns {Array.<Object>} An array of recommended learning material.
     */

    recommend(query, type = "materials") {
        const self = this;

        let recommendations;
        if (type === "materials") {
            recommendations = self.recommendMaterials(query);
        } else if (type === "bundle") {
            recommendations = self.recommendBundles(query);
        } else if (type === "personal") {
            recommendations = self.recommendPersonalized(query);
        } else if (type === "collaborative") {
            recommendations = self.recommendCollaborativeFiltering(query);
        } else {
            recommendations = Promise.resolve([[], []]);
        }
        // return an object
        return recommendations.then((results) => {
            if (results.error) {
                return results;
            }
            // return the list of recommended materials with their weights
            return results[0].map((material, id) =>
                self._materialFormat(material, results[1][id]));
        }).catch((error) => error);
    }


    /** ******************************************
     * Helper Functions
     ******************************************* */

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
            materialId,
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
        const maxCount = sort.perm.length < 10 ? sort.perm.length : 10;
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
            ...materialId && { material_id: materialId },
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
