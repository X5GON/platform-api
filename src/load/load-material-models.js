/********************************************************************
 * Load Material Models
 * This script creates and stores the material models in the database.
 * The material models are then used for creating user models.
 */

// external modules
const async = require('async');


// configurations
const config = require('@config/config');
const mimetypes = require('@config/mimetypes');

// get the schema of the database
const schema = config.pg.schema;

// internal modules
const updateHelper = require('@library/update-user-models');
const pg = require('@library/postgresQL')(config.pg);


/**
 * Prepare the material models and store them in the database.
 * @returns {Promise} The promise of creating material models.
 */
function prepareMaterialModels() {

    return new Promise((resolve, reject) => {

        /**
         * The promise of getting container urls.
         * @returns {String[]} The urls of pages that contain OER materials.
         */
        const OERQuery = new Promise((resolve, reject) => {

            // get urls that contain OER materials
            const query = `
                WITH url_containers AS (
                    SELECT *
                    FROM ${schema}.urls
                    WHERE ${schema}.urls.id IN (
                        SELECT container_id
                        FROM ${schema}.contains
                        WHERE ${schema}.contains.contains_id IS NOT NULL
                    )
                )

                SELECT DISTINCT (url)
                FROM url_containers
                WHERE material_id IS NULL;
            `;

            pg.execute(query, [], function(error, result) {
                if (error) {
                    console.log('Error executing query:', error);
                    return reject(error);
                }
                // get all provider uri values
                const providerUris = result.map(rec => rec.url);
                return resolve(providerUris);
            });
        });


        /**
         * The promise of getting urls of the material models.
         * @returns {String[]} The urls associated with the material models.
         */
        const MaterialQuery = new Promise((resolve, reject) => {
            // get provider uris from material models
            const query = `
                SELECT provider_uri
                FROM ${schema}.rec_sys_material_model;
            `;

            pg.execute(query, [], function(error, result) {
                if (error) {
                    console.log('Error executing query:', error);
                    return reject(error);
                }
                // get all provider uri values
                const providerUris = result.map(rec => rec.provider_uri);
                return resolve(providerUris);
            });
        });


        // process both promises and start creating material models
        Promise.all([OERQuery, MaterialQuery]).then(response => {
            // filter out the urls that have already been processed
            console.log(response[0].length, response[1].length);
            return response[0].filter(uri => !response[1].includes(uri));

        }).then(providerUris => {
            // iterate through all of the provider uris
            async.eachSeries(providerUris, function (provider_uri, xcallback) {

                // large query for getting all required material attributes (due to database schema)
                let query = `
                    WITH urls_extended AS (
                        SELECT
                            ${schema}.urls.*,
                            ${schema}.providers.name AS provider_name
                        FROM ${schema}.urls LEFT JOIN ${schema}.providers
                        ON ${schema}.urls.provider_id=${schema}.providers.id
                    ),

                    material_urls AS (
                        SELECT *
                        FROM urls_extended
                        WHERE id IN (
                            SELECT contains_id
                            FROM ${schema}.contains
                            WHERE container_id=(
                                SELECT id
                                FROM ${schema}.urls
                                WHERE url='${provider_uri.replace(/\'/g, "''")}'
                            )
                        )
                    ),

                    oer_materials_filtered AS (
                        SELECT *
                        FROM ${schema}.oer_materials
                        WHERE ${schema}.oer_materials.id IN (SELECT material_id FROM material_urls)
                    ),

                    oer_materials_extended AS (
                        SELECT
                            oer_materials_filtered.*,
                            material_urls.provider_name AS provider_name
                        FROM oer_materials_filtered LEFT JOIN material_urls
                        ON oer_materials_filtered.id = material_urls.material_id
                    ),

                    features_public_re_required AS (
                        SELECT *
                        FROM ${schema}.features_public
                        WHERE table_name='oer_materials' AND re_required IS TRUE
                    ),

                    oer_material_models AS (
                        SELECT
                            oer_materials_extended.title,
                            oer_materials_extended.description,
                            oer_materials_extended.language,
                            oer_materials_extended.mimetype,
                            oer_materials_extended.provider_name,
                            (features_public_re_required.value->>'value')::json AS wikipedia_concepts
                        FROM oer_materials_extended LEFT JOIN features_public_re_required
                        ON oer_materials_extended.id = features_public_re_required.record_id
                        WHERE features_public_re_required.name='wikipedia_concepts'
                    )

                    SELECT * FROM oer_material_models;`;


                pg.execute(query, [], function(error, results) {
                    if (error) {
                        console.log('Error fetching material metadata:' + error + '\nQuery: '+ query);
                        return xcallback(error);
                    }
                    // prepare placeholders
                    let type        = {},
                        language    = {},
                        wiki        = {},
                        title       = null,
                        description = null,
                        provider    = null,
                        supportLen  = 0;

                    for (let oer_material of results) {

                        // update provider uri mimetype distribution
                        if (!oer_material.mimetype) { type[oer_material.mimetype] = 0; }
                        type[oer_material.mimetype] += 1;

                        // update provider uri language distribution
                        if (!language.hasOwnProperty(oer_material.language)) {
                            language[oer_material.language] = 0;
                        }
                        language[oer_material.language] += 1;

                        // update provider uri title
                        if (!title) { title = oer_material.title; }

                        // update provider uri description
                        if (!description) {
                            description = oer_material.description;
                        }

                        // update provider uri provider information
                        if (!provider) {
                            if (oer_material.provider_name) {
                                provider = oer_material.provider_name;
                            }
                        }

                        // update provider uri provider information
                        for (let j = 0; j < oer_material.wikipedia_concepts.length; j++) {

                            // get concept names and support
                            const {
                                name,
                                secName,
                                supportLen: conceptSupportLen
                            } = oer_material.wikipedia_concepts[j];

                            // save concept name
                            let concept = (secName ? secName : name);

                            // temporary store the support length
                            let tmp = conceptSupportLen;
                            supportLen += tmp;

                            if (!wiki.hasOwnProperty(concept)) {
                                wiki[concept] = 0;
                            }
                            wiki[concept] += tmp;
                        }

                    }

                    // normalize wikipedia concept weight
                    for (let concept in wiki) {
                        wiki[concept] /= supportLen;
                    }

                    // go through the type list and assign the top one
                    let topType = null;
                    for (let mimetype in mimetypes) {
                        for (let key in type) {
                            if (mimetypes[mimetype].includes(key)) {
                                topType = key; break;
                            }
                        }
                        if (topType) { break; }
                    }
                    type = topType;

                    // get most common language of the material
                    let maxKey = null;
                    for (let key in language) {
                        if (!maxKey) {
                            maxKey = key;
                        } else if (language[key] > language[maxKey]) {
                            maxKey = key;
                        }
                    }
                    language = maxKey;

                    // prepare material model record
                    let values = {
                        title,
                        description,
                        language,
                        type,
                        provider_uri,
                        provider,
                        concepts: wiki
                    };

                    // store the material model
                    pg.upsert(values, { provider_uri: null }, `${schema}.rec_sys_material_model`, function(xerror, xresult) {
                        if (xerror){
                            console.log('Error inserting material model:', xerror, '\nprovider_uri:', values.provider_uri);
                            return xcallback(xerror);
                        }
                        console.log('Processed material:', values.provider_uri);
                        return xcallback(null);
                    });
                });

            }, function(error) {
                // all jobs are done
                if (error) {
                    console.log('There was error. Not doing anything');
                    return reject(error);
                }
                else {
                    console.log('Material models created');
                    return resolve(null);
                }
            });
        }); // Promise.then(providerUris)
    }); // new Promise(reject, resolve)
} // prepareMaterialModels()



/**
 * Creates and loads the user models into the database.
 * @returns {Promise} The promise of creating user models.
 */
function prepareUserModels() {

    return new Promise((resolve, reject) => {
        // the query of getting the user models' cookie ids
        let query = `
            SELECT DISTINCT uuid
            FROM ${schema}.rec_sys_user_model;`;

        pg.execute(query, [], function(error, result) {
            if (error) {
                console.log('Error checking user models: ' + error);
                return reject(error);
            }

            // there are no user models in the database
            if (result.length !== 0) {
                console.log('Nothing to update');
                return resolve(null);
            }

            // query for getting cookie activities
            const query = `
                WITH known_cookies AS (
                    SELECT *
                    FROM ${schema}.cookies
                    WHERE uuid NOT LIKE '%unknown%'
                ),

                cookie_activities AS (
                    SELECT
                        known_cookies.uuid AS uuid,
                        ${schema}.user_activities.url_id AS url_id
                    FROM known_cookies RIGHT JOIN ${schema}.user_activities
                    ON ${schema}.user_activities.cookie_id=known_cookies.id
                    WHERE known_cookies.uuid IS NOT NULL
                ),

                cookie_url AS (
                    SELECT
                        cookie_activities.uuid AS uuid,
                        array_agg(${schema}.urls.url) AS urls
                    FROM cookie_activities LEFT JOIN ${schema}.urls
                    ON cookie_activities.url_id=${schema}.urls.id
                    GROUP BY cookie_activities.uuid
                )

                SELECT * FROM cookie_url;
            `;

            pg.execute(query, [], function(xerror, xresult) {
                if (xerror) {
                    console.log('Error fetching user activity: ' + xerror);
                    return reject(xerror);
                }
                async.eachSeries(xresult, function(action, callback) {
                    // update user models with the given activity information
                    updateHelper.updateUserModel(action, callback);

                }, function (xerror) {
                    // all jobs are done
                    if (xerror) {
                        console.log('Error when processing user models:', xerror);
                        return reject(xerror);
                    }
                    else {
                        console.log('User models created');
                        resolve(null);
                    }
                });
            }); // pg.execute('cookie_url')
        }); // pg.execute('rec_sys_user_model')

    }); // new Promise(resolve, reject)
} // prepareUserModels()


/**
 * Initialize material and user models.
 * @param {Function} [callback] - The function to run after the process.
 */
function initialModelsImport(callback) {

    console.log('Checking whether to update models');

    prepareMaterialModels()
        .then(prepareUserModels)
        .then(function () {
            // execute the callback function
            // (building the recommender engine)
            console.log('FINISHED: initialModelsImport');
            if (callback && typeof(callback) === 'function') {
                callback();
            }
        }).then(function () {
            // after whole process: close postgres connection
            pg.close();
        });

} // initialModelsImport(callback)

// export initial models import
exports.initialModelsImport = initialModelsImport;