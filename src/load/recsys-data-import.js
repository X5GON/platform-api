/*
 * Import data for recommender engine.
 * 1. Create tables / Upgrade the database
 * 2. Load material and user models in PostgresQL database
 * 3. Build QMiner Recommender Engine base
 */

//internal modules
const dbUpdate = require('./create-postgres-tables');
const loadModels = require('./load-material-models');
const buildRecSys = require('./buildRecSys');

dbUpdate.startDBCreate(function(err){
    if (err){
        console.log("Create / Update postgres database failed.");
    }
    else{
        console.log("Database created");
        loadModels.initialModelsImport(function(err){
            if (err){
                console.log('Load material and user models in PostgresQL database failed.');
            }
            else{
                console.log('Models created');
                buildRecSys.build();
            }
        });
    }
});