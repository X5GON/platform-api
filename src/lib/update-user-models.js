// configurations
const config = require('../config/config');

// internal modules
const pg = require('./postgresQL')(config.pg);
const Logger = require('./logging-handler')();

const schema = config.pg.schema;

function addObjects(objectA, objectB){
    for (let c in objectB){
        if (objectA.hasOwnProperty(c)){
            objectA[c] += objectB[c];
        }
        else{
            objectA[c] = objectB[c];
        }
    }
    return objectA;
}//function addObjects

function multiplyObjects(objectA, num){
    for (let c in objectA){
        objectA[c] *= num;
    }
    return objectA;
}//function multiplyObjects

function updateUserModel(activity, callback){
    let query = `SELECT * FROM ${schema}.rec_sys_user_model WHERE uuid='${activity.uuid}'`;
    pg.execute(query, [], function(err, user){
        if (err){
            console.log('Error fetching user model: ' + err);
            if (callback && typeof(callback) === 'function'){
                callback();
            }
        }
        let escapedUri = activity.url.replace('\'', '\'\'');
        let query = `SELECT * FROM ${schema}.rec_sys_material_model WHERE provideruri LIKE 
            '${escapedUri}'`;
        pg.execute(query, [], function(err, material){
            if (err){
                console.log('Error fetching material model: ' + err);
                console.log('Query: ' + query);
                if (callback && typeof(callback) === 'function'){
                    callback();
                }
            }
            if (material.length == 0){
                //material is not stored in db
                if (callback && typeof(callback) === 'function'){
                    callback();
                }
            }
            else {
                material = material[0];
                if (user.length == 0){
                    user = {
                        uuid: activity.uuid,
                        language: {},
                        visited: {
                            count: 0
                        },
                        type: {},
                        concepts: {}
                    };
                }
                else user = user[0];
                //check if the user has visited the material before
                if (material && user){
                    if (user.visited.hasOwnProperty(material.provideruri)){
                        // user has already seen the material - nothing to do
                        user.visited[material.provideruri] += 1;
                        return callback();
                    }
                    //if user has not seen the material
                    let count = user.visited.count;
                    let concepts = JSON.parse(JSON.stringify(user.concepts)); // copy concepts object
                    concepts = multiplyObjects(concepts, count);
                    concepts = addObjects(concepts, material.concepts);
                    concepts = multiplyObjects(concepts, 1 / (count + 1));
                    user.concepts = concepts;
                    
                    user.visited[material.provideruri] = 1;
                    user.visited.count += 1;
                    
                    //handle type and language
                    for (let type in material.type){
                        if (!user.type.hasOwnProperty(type)){
                            user.type[type] = 0;
                        }
                        user.type[type] += 1;
                    }
                    
                    for (let language in material.language){
                        if (!user.language.hasOwnProperty(language)){
                            user.language[language] = 0;
                        }
                        user.language[language] += 1;
                    }
                    
                    let conditions = {uuid: activity.uuid};
                    
                    pg.upsert(user, conditions, `${schema}.rec_sys_user_model` , function(err){
                        if (err){
                            console.log('Error upserting user model: ', + err);
                            return process.exit(1);
                        }
                        if (callback && typeof(callback) === 'function'){
                            callback();
                        }
                    });
                }
            }
        });
    });
}

exports.updateUserModel = updateUserModel;


