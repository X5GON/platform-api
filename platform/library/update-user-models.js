/** **********************************************
 * User Models Update Module
 * This module exports the function used for
 * updating the user model using the provided
 * user activity data.
 */

// configurations
const config = require("../config/config");

// internal modules
const pg = require("./postgresQL")(config.pg);

// get postgres schema
const schema = config.pg.schema;

/**
 * @description Copies attributes from the second object to the first one.
 * @param {Object} objectA - The object to which we wish to copy values.
 * @param {Object} objectB - The object containing the attributes to copy.
 * @returns {Object} The first parameter provided to this function.
 */
function addObjects(objectA, objectB) {
    for (let c in objectB) {
        if (objectA.hasOwnProperty(c)) {
            objectA[c] += objectB[c];
        } else {
            objectA[c] = objectB[c];
        }
    }
    return objectA;
} // function addObjects

/**
 * @description Multiplies attributes of the provided object with the provided value.
 * @param {Object} objectA - The object containing the values.
 * @param {Number} num - The value used to multiply with all object attributes.
 * @returns {Object} The provided object.
 */
function multiplyObjects(objectA, num) {
    for (let c in objectA) {
        objectA[c] *= num;
    }
    return objectA;
} // function multiplyObjects

/**
 * @description Updates a user model using the provided activity data.
 * @param {Object} activity - The user activity data used for updating the user model.
 * @param {String} activity.uuid - The user identifier.
 * @param {String} activity.url - The url viewed by the user.
 * @param {Function} [callback] - The function to be executed after the process is done.
 */
function updateUserModel(activity, cb) {
    // setup the default callback function
    const callback = cb && typeof (cb) === "function"
        ? cb : function (error) { if (error) console.log(error); };

    // extract activity data
    const {
        uuid,
        urls
    } = activity;

    // get corresponding user model
    let query = `
        SELECT *
        FROM ${schema}.rec_sys_user_model
        WHERE uuid='${uuid}';`;

    pg.execute(query, [], (error, user_model) => {
        if (error) {
            console.log(`Error fetching user model: ${error}`);
            return callback(error);
        }

        // escape the provider uri and query for material models
        let escapedUris = urls.map((url) => url.replace("'", "''"));

        let query = `
            SELECT *
            FROM ${schema}.rec_sys_material_model
            WHERE provider_uri SIMILAR TO '%(${escapedUris.join("|")})%'`;

        let user;
        if (user_model.length === 0) {
            user = {
                uuid: activity.uuid,
                language: { },
                visited: {
                    count: 0
                },
                type: { },
                concepts: { }
            };
        } else { user = user_model[0]; }

        pg.executeLarge(query, [], 10, (xerror, material_models, cb) => {
            if (xerror) {
                console.log(`Error fetching material model: ${xerror}`);
                console.log(`Query: ${query}`);
                return callback(xerror);
            }

            // get or create user model
            for (let material of material_models) {
                // check if the user has visited the material before
                if (material && user) {
                    if (user.visited.hasOwnProperty(material.provider_uri)) {
                        // user has already seen the material - nothing to do
                        user.visited[material.provider_uri] += 1;
                        return callback();
                    }
                    // if user has not seen the material
                    const count = user.visited.count;

                    let concepts = JSON.parse(JSON.stringify(user.concepts)); // copy concepts object
                    concepts = multiplyObjects(concepts, count);
                    concepts = addObjects(concepts, material.concepts);
                    concepts = multiplyObjects(concepts, 1 / (count + 1));
                    user.concepts = concepts;

                    // update visited count and url
                    user.visited[material.provider_uri] = 1;
                    user.visited.count += 1;

                    // update the type profile of the user
                    if (!user.type.hasOwnProperty(material.type)) {
                        user.type[material.type] = 0;
                    }
                    user.type[material.type] += 1;

                    // update the language profile of the user
                    if (!user.language.hasOwnProperty(material.language)) {
                        user.language[material.language] = 0;
                    }
                    user.language[material.language] += 1;
                }
            }
            // get the next batch of materials
            cb();
        }, (error) => {
            if (error) {
                console.log("Error", error);
                return callback(error);
            }

            console.log("Processing user:", activity.uuid, "url count:", urls.length);
            // insert or update the user model to the database
            pg.upsert(user, { uuid: null }, `${schema}.rec_sys_user_model`, (yerror) => {
                if (yerror) {
                    console.log("Error upserting user model: ", +yerror);
                    return callback(yerror);
                }
                return callback();
            });
        }); // pg.execute('rec_sys_material_model')
    }); // pg.execute('rec_sys_user_model')
} // function updateUserModel

// export the user model updating function
exports.updateUserModel = updateUserModel;
