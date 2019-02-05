// configurations
const config = require('../../../config/config');

// external modules
const async = require('async');

// internal modules
const pg = require('../../../lib/postgresQL')(config.pg);
const Logger = require('../../../lib/logging-handler')();
const updateHelper = require('../../../lib/update-user-models');

// check if config.schema is defined
const schema = config.pg.schema;

const queryOerMaterial = `SELECT DISTINCT providerUri FROM ${schema}.oer_materials_update;`;

const queryMaterialModel = `SELECT DISTINCT providerUri FROM ${schema}.rec_sys_material_model;`;

function prepareMaterialModels(callback) {
    pg.execute(queryOerMaterial,[], function (err, result) {
        if (err){
            console.log('Error checking OER Materials:' + err);
            return process.exit(1);
        }
        let oerMaterials = {};
        for (let i = 0; i < result.length; i++){
            oerMaterials[result[i].provideruri] = 0;
        }
        result = null;
        pg.execute(queryMaterialModel, [], function(err, result){
            if (err){
                console.log('Error checking material models:' + err);
                return process.exit(1);
            }
            for (let i = 0; i < result.length; i++){
                delete oerMaterials[result[i].provideruri];
            }
            let toUpdate = Object.keys(oerMaterials);
            oerMaterials = null;
            console.log(toUpdate.length);
            async.eachSeries(toUpdate, function(provideruri, callback){
                let query = `SELECT * FROM ${schema}.oer_materials_update WHERE 
                    provideruri='${provideruri}';`;
                   
                pg.execute(query, [], function(err, result){
                    if (err){
                        console.log('Error fetching material metadata:' + err + '\nQuery: '+ query);
                        callback(err);
                    }
                    let type = {}, language = {}, wiki = {}, title = null, description = null, provider = null;
                    let supportLen = 0;
                    for (let i = 0; i < result.length; i++){
                        //console.log(Object.keys(result[i]));
                        if (!type.hasOwnProperty(result[i].type.mime)){
                            type[result[i].type.mime] = 0;
                        }
                        type[result[i].type.mime] += 1;
                        if (!language.hasOwnProperty(result[i].language)){
                            language[result[i].language] = 0;
                        }
                        language[result[i].language] += 1;
                        if (!title){
                            title = result[i].title;
                        }
                        if (!description){
                            description = result[i].description;
                        }
                        if (!provider){
                            if (result[i].hasOwnProperty('providermetadata')){
                                provider = result[i].providermetadata.title;
                            }
                        }
                        for (let j = 0; j < result[i].materialmetadata.wikipediaConcepts.length; j++){
                            let concept = (result[i].materialmetadata.wikipediaConcepts[j].secName ? 
                                result[i].materialmetadata.wikipediaConcepts[j].secName : 
                                result[i].materialmetadata.wikipediaConcepts[j].name);
                            let tmp = result[i].materialmetadata.wikipediaConcepts[j].supportLen;
                            supportLen += tmp;
                            if (!wiki.hasOwnProperty(concept)){
                                wiki[concept] = 0;
                            }  
                            wiki[concept] += tmp;                            
                        }
                    }
                    for (let concept in wiki){
                            wiki[concept] /= supportLen;
                    }
                    
                    //get most common type of the material
                    let maxKey = null;
                    for (let key in type){
                        if (!maxKey){
                            maxKey = key;
                        }
                        else if (type[key] > type[maxKey]){
                            maxKey = key;
                        }
                    }
                    type = maxKey;
                    
                    //get most common language of the material
                    maxKey = null;
                    for (let key in language){
                        if (!maxKey){
                            maxKey = key;
                        }
                        else if (language[key] > language[maxKey]){
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
                    
                    pg.insert(values, `${schema}.rec_sys_material_model`, function(err, result){
                        if (err){
                            console.log('Error inserting material model:' + err + '\nproviderUri: ' + 
                                values.provideruri);
                            callback(err);
                        }
                        callback();
                    });
                });
            }, function(err){
                // all jobs are done
                if (err) {
                    console.log('There was err. Not doing anything');
                    return process.exit(1);
                }
                else {
                    console.log('Material models created');
                    callback();
                }
            });
            //callback();
        });
    });
}//prepareMaterialModels

const queryUserModels = `SELECT DISTINCT uuid FROM ${schema}.rec_sys_user_model;`;

const queryUserActivity = `SELECT uuid, url FROM ${schema}.client_activity WHERE uuid<>'unknown:not-tracking'`;

function prepareUserModels(callback){
    pg.execute(queryUserModels, [], function(err, result){
        if (err){
            console.log('Error checking user models: ' + err);
            return process.exit(1);
        }
        if (result.length != 0){
            console.log('Nothing to update');
            return callback();
        }
        pg.execute(queryUserActivity, [], function(err, result){
            if (err){
                console.log('Error fetching user activity: ' + err);
                return process.exit(1);
            }
            async.eachSeries(result, function (action, callback){
                updateHelper.updateUserModel(action, callback);
            }, function(err){
                 // all jobs are done
                if (err) {
                    console.log('There was err. Not doing anything');
                    return process.exit(1);
                }
                else {
                    console.log('User models created');
                    callback();
                }
            });
        });
        
    });    
};//prepareUserModels


/**
 * start DB Creation
 */
function initialModelsImport(callback) {
    console.log('Checking whether to update models');
    prepareMaterialModels(function () {
        prepareUserModels(function () {
            console.log('DONE (initialModelsImport)');
            pg.close();
            if (callback && typeof(callback) === 'function'){
                callback();
            }
        });
    });
}//startDbCreate
exports.initialModelsImport = initialModelsImport;