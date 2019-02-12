// configurations
const config = require('../config/config');

// external modules
const async = require('async');

// internal modules
const pg = require('../lib/postgresQL')(config.pg);
const updateHelper = require('../lib/update-user-models');

// check if config.schema is defined
const schema = config.pg.schema;



function prepareMaterialModels() {

    return new Promise((resolve, reject) => {

        /**
         * The promise of getting provideruri-s of the oer_materials_update table
         */
        const OERQuery = new Promise((resolve, reject) => {

            pg.execute(`SELECT DISTINCT providerUri FROM ${schema}.oer_materials_update;`, [], function(error, result) {
                if (error) {
                    console.log('Error checking oer_materials_update:', error);
                    return reject(error);
                }
                // get all provider uri values
                const providerUris = result.map(rec => rec.provideruri);
                return resolve(providerUris);
            });
        });

        /**
         * The promise of getting provideruri-s of the rec_sys_material_model table
         */
        const MaterialQuery = new Promise((resolve, reject) => {

            pg.execute(`SELECT DISTINCT providerUri FROM ${schema}.rec_sys_material_model;`, [], function(error, result) {
                if (error) {
                    console.log('Error checking rec_sys_material_model:', error);
                    return reject(error);
                }
                // get all provider uri values
                const providerUris = result.map(rec => rec.provideruri);
                return resolve(providerUris);
            });
        });


        Promise.all([OERQuery, MaterialQuery]).then(response => {
            // get the uris
            return response[0].filter(uri => -1 !== response[1].indexOf(uri));
        }).then(providerUris => {
            // iterate through all of the provider uris
            async.eachSeries(providerUris, function(provideruri, xcallback) {

                let query = `SELECT * FROM ${schema}.oer_materials_update WHERE
                    provideruri='${provideruri}';`;

                pg.execute(query, [], function(error, result) {
                    if (error){
                        console.log('Error fetching material metadata:' + error + '\nQuery: '+ query);
                        return xcallback(error);
                    }
                    // prepare placeholders
                    let type = {}, language = {}, wiki = {}, title = null, description = null, provider = null;
                    let supportLen = 0;

                    for (let i = 0; i < result.length; i++) {
                        // update provider uri mimetype distribution
                        if (!type.hasOwnProperty(result[i].type.mime)) {
                            type[result[i].type.mime] = 0;
                        }
                        type[result[i].type.mime] += 1;

                        // update provider uri language distribution
                        if (!language.hasOwnProperty(result[i].language)) {
                            language[result[i].language] = 0;
                        }
                        language[result[i].language] += 1;

                        // update provider uri title
                        if (!title) { title = result[i].title; }

                        // update provider uri description
                        if (!description) {
                            description = result[i].description;
                        }

                        // update provider uri provider information
                        if (!provider) {
                            if (result[i].hasOwnProperty('providermetadata')){
                                provider = result[i].providermetadata.title;
                            }
                        }

                        // update provider uri provider information
                        for (let j = 0; j < result[i].materialmetadata.wikipediaConcepts.length; j++) {
                            let concept = (result[i].materialmetadata.wikipediaConcepts[j].secName ?
                                        result[i].materialmetadata.wikipediaConcepts[j].secName :
                                        result[i].materialmetadata.wikipediaConcepts[j].name);

                            let tmp = result[i].materialmetadata.wikipediaConcepts[j].supportLen;
                            supportLen += tmp;

                            if (!wiki.hasOwnProperty(concept)) {
                                wiki[concept] = 0;
                            }
                            wiki[concept] += tmp;
                        }
                    }

                    // normalize wikipedia concept weight
                    for (let concept in wiki){
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
                        provideruri: provideruri,
                        type: type,
                        language: language,
                        concepts: wiki,
                        title: title,
                        description: description,
                        provider: provider
                    };

                    pg.upsert(values, { provideruri: null }, `${schema}.rec_sys_material_model`, function(xerror, xresult) {
                        if (xerror){
                            console.log('Error inserting material model:' + xerror + '\nproviderUri: ' +
                                values.provideruri);
                            return xcallback(xerror);
                        }
                        console.log('Processed material:', values.provideruri);
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

            pg.execute(`SELECT uuid, url FROM ${schema}.client_activity WHERE uuid<>'unknown:not-tracking'`, [], function(xerror, xresult) {
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