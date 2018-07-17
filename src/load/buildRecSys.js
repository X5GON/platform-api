/********************************************************************
 * Build OER Material Recommender System
 * This script loads the oer materials from PostgresQL and builds
 * the content based recommendation models using raw content and
 * wikipedia concepts, extracted from the raw content using wikifier
 * (http://wikifier.org).
 */

// external modules
const qm = require('qminer');

// internal modules
const Logger = require('../lib/logging-handler')();

// create a logger instance for logging recommendation requests
const logger = Logger.createGroupInstance('recommendation-model-build', 'x5recommend');
// initialize connection with postgresql 
const pg = require('../lib/postgresQL')(require('../config/pgconfig'));

/********************************************
 * Run Script
 *******************************************/

// initialize database
let x5recommend = new (require('../server/recsys/engine/x5recommend'))({
    mode: 'createClean',
    path: '../../data/recsys'
});


pg.selectLarge({ }, 'oer_materials', 10, (error, results) => {
    // handle error and close the postgres connection
    if (error) { 
        logger.error('error when retrieving from postgres', { error: error.message });
        return;
    }
    for (let material of results) {
        logger.info(`next record being processed id=${material.id}`);
        // extract values from postgres record
        let { 
            title, 
            description, 
            materialurl: url, 
            author: authors, 
            language, 
            type: { ext: extension, mime: mimetype },  
            providermetadata: { title: provider },
            materialmetadata: { rawText: rawContent, wikipediaConcepts }
        } = material;


        if (authors) { authors = authors.substring(1, authors.length -1).split(','); }

        let wikipediaConceptNames    = [];
        let wikipediaConceptPageRank = [];
        let wikipediaConceptCosine   = [];

        // prepare wikipedia concepts if they exist
        if (wikipediaConcepts) {
            wikipediaConcepts.forEach(concept => { 
                // set the wikipedia concepts for the record
                let uri = concept.secUri ? concept.secUri : concept.uri;
                wikipediaConceptNames.push(uri);
                wikipediaConceptPageRank.push(concept.pageRank);
                wikipediaConceptCosine.push(concept.cosine);
            });
        }


        // create new record and 
        let record = {
            url,
            title,
            description,
            rawContent,
            provider,
            authors,
            extension,
            mimetype,
            language,
            wikipediaConceptNames,
            wikipediaConceptPageRank,
            wikipediaConceptCosine
        };

        // push to the recommendation model 
        x5recommend.pushRecordContent(record);
        logger.info(`pushed record with id=${material.id}`, { url });

    }
}, (error) => {    // write the material jsons
    if (error) { 
        logger.error('error when processing data from postgres', { error: error.message });
    } else {
        // build the models
        logger.info('building recommendation models');
        x5recommend.createModels();
        logger.info('recommendation models built successfully');
    }
    logger.info('closing models and connections');
    x5recommend.close();
    // close the connection with postgres
    logger.info('closed');
});