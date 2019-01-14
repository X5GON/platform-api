// configurations
const config = require('../config/config');

// external modules
const async = require('async');

// prepare postgresql connection to the database
const pg = require('../lib/postgresQL')(config.pg);

// check if config.schema is defined
const schema = config.pg.schema;
let pg_version = config.pg.version;

// returns row containing boolean true if schema in config exists, false otherwise
const schemaExistsString = `SELECT exists(SELECT schema_name FROM information_schema.schemata WHERE
    schema_name = '${schema}') AS schema_exists;`;
                            
// creates new schema from config
const createSchemaString = `CREATE schema ${schema};`;      

// returns a row containing integer version of DB
const checkVersion = `SELECT ver FROM ${schema}.version`;

const tablesExistString = `SELECT * FROM information_schema.tables 
    WHERE table_schema = '${schema}'`;

// DB initially creates data bases
const dbCreates = {
    client_activity:
        `CREATE TABLE ${schema}.client_activity 
            (id serial PRIMARY KEY,
             uuid varchar NOT NULL,
             provider varchar NOT NULL,
             url varchar NOT NULL, 
             visitedOn timestamp with time zone NOT NULL,
             referrer varchar NOT NULL,
             userAgent varchar NOT NULL, 
             language varchar NOT NULL);
        
        ALTER TABLE ${schema}.client_activity OWNER 
            TO ${config.pg.user};
        
        CREATE INDEX client_activity_id
            ON ${schema}.client_activity(id);
            
        CREATE INDEX client_activity_userid 
            ON ${schema}.client_activity(uuid);
        
        CREATE INDEX client_activity_provider
            ON ${schema}.client_activity(provider);
        
        CREATE INDEX client_activity_visitedOn 
            ON ${schema}.client_activity(visitedOn);`,
            
    repositories:
        `CREATE TABLE ${schema}.repositories 
            (id serial PRIMARY KEY,
             name varchar NOT NULL,
             domain varchar NOT NULL,
             contact varchar NOT NULL,
             token varchar NOT NULL);
        
        ALTER TABLE ${schema}.repositories OWNER 
            TO ${config.pg.user};
        
        CREATE INDEX repositories_name_idx
            ON ${schema}.repositories(name);
        
        CREATE INDEX repositories_domain_idx
            ON ${schema}.repositories(domain);
        
        CREATE INDEX repositories_contact_idx
            ON ${schema}.repositories(contact);
        
        CREATE INDEX repositories_token_idx
            ON ${schema}.repositories(token);`,
    
    oer_materials:
        `CREATE TABLE ${schema}.oer_materials
            (id serial PRIMARY KEY,
             title varchar NOT NULL,
             description varchar,
             providerUri varchar NOT NULL,
             materialUrl varchar NOT NULL,
             author varchar,
             language varchar NOT NULL,
             dateCreated timestamp with time zone,
             dateRetrieved timestamp with time zone,
             type jsonb,
             providerMetadata jsonb NOT NULL,
             materialMetadata jsonb NOT NULL);
        
        ALTER TABLE ${schema}.oer_materials OWNER 
            TO ${config.pg.user};
        
        CREATE INDEX oer_materials_materialUrl_idx 
            ON ${schema}.oer_materials(materialUrl);
        
        CREATE INDEX oer_materials_type_idx
            ON ${schema}.oer_materials(type);`,
    
    oer_queue:
        `CREATE TABLE ${schema}.oer_queue
            (id serial NOT NULL,
             materialUrl varchar NOT NULL PRIMARY KEY,
             providerUri varchar NOT NULL,
             inserted timestamp with time zone DEFAULT NOW());
        
        CREATE INDEX oer_queue_materialUrl_idx
            ON ${schema}.oer_queue(materialUrl);
        
        CREATE INDEX oer_queue_inserted_idx
            ON ${schema}.oer_queue(inserted);`,
            
    version:
        `CREATE TABLE ${schema}.version ( ver integer PRIMARY KEY);`
};

/* DB updates
 * Template: {version: <int>, update: `string (SQL query)`}
 */
const dbUpdates = [
    {version: 1, update: `CREATE TABLE ${schema}.banana ( ver integer PRIMARY KEY);`}];

// latest pg version
const latestVersion = dbUpdates.length;
// set latest version
if (pg_version === '*') pg_version = latestVersion;

/**
 * check if schema exists, create it otherwise
 * @param callback
 */
function prepareSchema(callback) {
    pg.execute(schemaExistsString,[], function (err, result) {
        if (!result[0].schema_exists) {
            console.log(`Creating new schema ${schema.toUpperCase()}`);
            pg.execute(createSchemaString, [], function (err, r) {
                if (err) {
                    console.log(`Error creating schema:${err}`);
                    return process.exit();
                }
                callback();
            });
        }
        else {
            callback();
        }
    });
}//prepareSchema

/**
 * Check if tables exists, create them otherwise
 * @param maincallback
 */
function prepareTables(maincallback) {
    pg.execute(tablesExistString, [], function (err, res) {
        if (err) {
            console.log('Error checking tables:' + err);
            return process.exit();
        }
        
        // delete already existing tables from dbCreates object
        for (let i = 0; i < res.length; i++) {
            let tableName = res[i].table_name;
            delete dbCreates[tableName];
        }
        
        // create a list of all non-existing tables to loop through with async
        let tableCreates = Object.keys(dbCreates);
        
        async.eachSeries(tableCreates,
            // 2nd param is the function that each item is passed to
            function (tableCreateKey, callback) {
                let sql = dbCreates[tableCreateKey];
                // execute create query from dbCreates for a specific table
                pg.execute(sql, [], function (err, result) {
                    if (err) {
                        console.log('Error creating tables:' +
                            tableCreateKey + ': ' + err);
                        return process.exit();
                    }
                    callback();
                });

            },
            function (err) {
                // All tasks are done now
                if (err) {
                    console.log('There was err. Not doing anything');
                    return process.exit();
                }
                else {
                    console.log('Tables created');
                    maincallback();
                }
            }
        );
    });
}//prepareTables

/**
 * Updates DB to version specified in config.json
 * To implement an update, add following block:
 * doUpdate(X, '<SQL STRING>');
 * X -> Update level ( 1 more than previous)
 * <SQL STRING> -> SQL statement for update.
 * For multiple statements, it's possible to separate them with semi-colon-';'
 *
 * @returns Version DB was updated to
 */
function updateTables (callback) {
    const vGoal = parseInt(pg_version);
    const vMax = (dbUpdates.length)? dbUpdates[dbUpdates.length - 1].version : 0;
    let vCurrent = 0;
    console.log(`About to update DB to version ${vGoal} out of max version: ${vMax}`);
    
    // log the update and update the version in db
    const logUpdate = function (version, logCallback) {
        console.log(`Updating database version : v${version} => 
                                v${parseInt(version + 1)}`);
        let query = `UPDATE ${schema}.version 
                      SET ver = ${parseInt(version + 1)} 
                      WHERE ver = ${parseInt(version)};`;
        if (version == 0) {
            query = `INSERT INTO ${schema}.version (ver) VALUES (1);`;
        }
        pg.execute(query, [], function (err, r) {
            logCallback();
        });
    };

    /**
     * Wrap the update into a separate function, to make the main update stream
     * less verbose
     * */
    function doUpdate(_version, _sql, callback) {
        if (vCurrent < _version && _version <= vGoal) {
            console.log('Applying version ${_version}: ' + _sql);
            if (_sql == '') {
                logUpdate(vCurrent, function () {
                    vCurrent++;
                    return callback(null);
                });
                return;
            }

            pg.execute(_sql, [], function (err, res) {
                if (err) {
                    console.log(err);
                    return callback(err);
                }

                logUpdate(vCurrent, function () {
                    vCurrent++;
                    callback(null);
                });
            });//query
        }
        else {
            callback(null);
        }
    }//doSingleUpdate

    pg.execute(checkVersion, [], function (err, r) {
        // check the current version of the db
        if (err) {
            console.error('Problem checking version:' + err);
            return process.exit();
        }

        if (r.length > 0) {
            vCurrent = r[0].ver;
        }
        console.log(`Current version is ${vCurrent}`);
        // loop through all item s in dbUpdates and execute the queries
        async.eachSeries(dbUpdates,
            // 2nd param is the function that each item is passed to
            function (updateObj, callback) {
                doUpdate(updateObj.version, updateObj.update,
                    function (err) {
                        callback(err);
                    });
            },
            // 3rd param is the function to call when everything's done
            function (err) {
                // All tasks are done now
                if (err) {
                    console.log('There was err. Not doing anything');
                }
                else {
                    console.log('done updating');
                    callback();
                }
            }
        );//async
    });
};//updateTables




/**
 * start DB Creation
 */
function startDBCreate(callback) {
    console.log('Checking whether to update database');
    prepareSchema(function () {
        prepareTables(function () {   
            updateTables(function () {
                console.log('DONE');
                pg.close();
                if (callback && typeof(callback) === 'function'){
                    callback();
                }
            });
        });
    });
}//startDbCreate
exports.startDBCreate = startDBCreate;

//startDBCreate();