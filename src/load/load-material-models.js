// configurations
const config = require('@config/config');

// external modules
const async = require('async');

// internal modules
const pg = require('@lib/postgresQL')(config.pg);
const updateHelper = require('@lib/update-user-models');

// check if config.schema is defined
const schema = config.pg.schema;



function prepareMaterialModels() {

    return new Promise((resolve, reject) => {

        /**
         * The promise of getting provideruri-s of the oer_materials_update table
         */
        const OERQuery = new Promise((resolve, reject) => {

            const query = `
                SELECT url
                FROM ${schema}.urls
                WHERE material_id IS NULL;
            `;

            pg.execute(query, [], function(error, result) {
                if (error) {
                    console.log('Error checking oer_materials_update:', error);
                    return reject(error);
                }
                // get all provider uri values
                const providerUris = result.map(rec => rec.url);
                return resolve(providerUris);
            });
        });

        /**
         * The promise of getting provideruri-s of the rec_sys_material_model table
         */
        const MaterialQuery = new Promise((resolve, reject) => {

            const query = `
                SELECT provider_uri
                FROM ${schema}.rec_sys_material_model;
            `;

            pg.execute(query, [], function(error, result) {
                if (error) {
                    console.log('Error checking rec_sys_material_model:', error);
                    return reject(error);
                }
                // get all provider uri values
                const providerUris = result.map(rec => rec.provider_uri);
                return resolve(providerUris);
            });
        });


        Promise.all([OERQuery, MaterialQuery]).then(response => {
            // get the uris
            console.log(response[0].length, response[1].length);
            return response[0].filter(uri => !response[1].includes(uri));
        }).then(providerUris => {
            // iterate through all of the provider uris
            async.eachSeries(providerUris, function (provideruri, xcallback) {
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
                                WHERE url='${provideruri.replace(/\'/g, "''")}'
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
                    if (error){
                        console.log('Error fetching material metadata:' + error + '\nQuery: '+ query);
                        return xcallback(error);
                    }
                    // prepare placeholders
                    let type = {}, language = {}, wiki = {}, title = null, description = null, provider = null;
                    let supportLen = 0;

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
                            // get concept name and secondary name
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

                    //get most common type of the material
                    let maxKey = null;
                    for (let key in type) {
                        if (!maxKey) {
                            maxKey = key;
                        }
                        else if (type[key] > type[maxKey]) {
                            maxKey = key;
                        }
                    }
                    type = maxKey;

                    //get most common language of the material
                    maxKey = null;
                    for (let key in language) {
                        if (!maxKey) {
                            maxKey = key;
                        }
                        else if (language[key] > language[maxKey]) {
                            maxKey = key;
                        }
                    }
                    language = maxKey;

                    let values = {
                        provider_uri: provideruri,
                        type: type,
                        language: language,
                        concepts: wiki,
                        title: title,
                        description: description,
                        provider: provider
                    };

                    pg.upsert(values, { provider_uri: null }, `${schema}.rec_sys_material_model`, function(xerror, xresult) {
                        if (xerror){
                            console.log('Error inserting material model:' + xerror + '\nprovider_uri: ' +
                                values.provider_uri);
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
        });
    });
}//prepareMaterialModels



function prepareUserModels() {

    return new Promise((resolve, reject) => {
        pg.execute(`SELECT DISTINCT uuid FROM ${schema}.rec_sys_user_model;`, [], function(error, result) {
            if (error){
                console.log('Error checking user models: ' + error);
                return reject(error);
            }
            if (result.length !== 0) {
                console.log('Nothing to update');
                return resolve(null);
            }

            // get user activity data from known users
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
                    FROM known_cookies LEFT JOIN ${schema}.user_activities
                    ON ${schema}.user_activities.cookie_id=known_cookies.id
                ),

                cookie_url AS (
                    SELECT
                        cookie_activities.uuid AS uuid,
                        ${schema}.urls.url AS url
                    FROM cookie_activities LEFT JOIN ${schema}.urls
                    ON cookie_activities.url_id=${schema}.urls.id
                )

                SELECT * FROM cookie_url;
            `;


            pg.execute(query, [], function(xerror, xresult) {
                if (xerror){
                    console.log('Error fetching user activity: ' + xerror);
                    return reject(xerror);
                }
                async.eachSeries(xresult, function(action, callback) {
                    updateHelper.updateUserModel(action, callback);
                }, function (xerror) {
                    // all jobs are done
                    if (xerror) {
                        console.log('There was err. Not doing anything');
                        return reject(xerror);
                    }
                    else {
                        console.log('User models created');
                        resolve(null);
                    }
                });
            });

        });
    });
}//prepareUserModels


/**
 * start DB Creation
 */
function initialModelsImport(callback) {

    console.log('Checking whether to update models');
    prepareMaterialModels()
        .then(prepareUserModels)
        .then(function () {
            //tu narediš še buildRecSys
            console.log('DONE (initialModelsImport)');
            if (callback && typeof(callback) === 'function'){
                callback();
            }
        }).then(function () {
            // close postgres connection
            pg.close();
        });

}//startDbCreate
exports.initialModelsImport = initialModelsImport;