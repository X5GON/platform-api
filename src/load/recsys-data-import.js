/**********************************************************
 * Import data for recommender engine
 *
 * Process:
 * 1. Create tables / Upgrade the database
 * 2. Load material and user models in PostgresQL database
 * 3. Build QMiner Recommender Engine base
 */

//internal modules
const dbUpdate    = require('./create-postgres-database');
const loadModels  = require('./load-material-models');
const buildRecSys = require('./recsys-model-build');

// start database creation
dbUpdate.startDBCreate(function(error) {
    if (error) {
        console.log('Error in startDBCreate', error);
    } else {
        console.log("Database created");
        // initialize material and user models creation
        loadModels.initialModelsImport(function(xerror) {
            if (xerror) {
                console.log('Error in initialModelsImport', xerror);
            } else {
                console.log('Models created');
                // build recommender engines
                buildRecSys.build();
            }
        });
    }
});