/********************************************************************
 * Build OER Material Recommender System
 * This script loads the oer materials from PostgresQL and builds
 * the content based recommendation models using raw content and
 * wikipedia concepts, extracted from the raw content using wikifier
 * (http://wikifier.org).
 */

// configurations
const config = require('@config/config');


// internal modules
const Logger = require('@lib/logging-handler')();
// create a logger instance for logging recommendation requests
const logger = Logger.createGroupInstance('recommendation-model-build', 'x5recommend');
// initialize connection with postgresql
const pg = require('@lib/postgresQL')(config.pg);

// check if config.schema is defined
const schema = config.pg.schema;

/********************************************
 * Run Script
 *******************************************/

// initialize database
let x5recommend = new (require('../server/recsys/engine/x5recommend'))({
    mode: 'createClean',
    path: '../../data/recsys'
});


function build(callback) {


    // select all required values for building the recommender models
    const query = `
        WITH urls_extended AS (
            SELECT
                ${schema}.urls.*,
                ${schema}.providers.name AS provider_name
            FROM ${schema}.urls LEFT JOIN ${schema}.providers
            ON ${schema}.urls.provider_id=${schema}.providers.id
        ),

        oer_materials_filtered AS (
            SELECT *
            FROM ${schema}.oer_materials
            WHERE ${schema}.oer_materials.id IN (SELECT material_id FROM urls_extended)
        ),

        oer_materials_extended AS (
            SELECT
                ${schema}.oer_materials.*,
                urls_extended.url AS url,
                urls_extended.provider_name AS provider_name
            FROM ${schema}.oer_materials LEFT JOIN urls_extended
            ON ${schema}.oer_materials.id = urls_extended.material_id
        ),

        features_public_re_required_wikipedia_concepts AS (
            SELECT
                (${schema}.features_public.value->>'value')::json AS value,
                ${schema}.features_public.record_id
            FROM ${schema}.features_public
            WHERE ${schema}.features_public.table_name='oer_materials' AND ${schema}.features_public.re_required IS TRUE AND ${schema}.features_public.name = 'wikipedia_concepts'
        ),

        text_extractions AS (
            SELECT
                ${schema}.material_contents.material_id,
                (${schema}.material_contents.value->>'value')::text AS value
            FROM ${schema}.material_contents
            WHERE ${schema}.material_contents.type='text_extraction'
        ),

        transcriptions AS (
            SELECT
                ${schema}.material_contents.material_id,
                (${schema}.material_contents.value->>'value')::text AS value
            FROM ${schema}.material_contents
            WHERE ${schema}.material_contents.type='transcription' AND ${schema}.material_contents.extension='plain'
        ),

        oer_material_models_text_extraction AS (
            SELECT
                oer_materials_extended.*,
                text_extractions.value AS text_extraction
            FROM oer_materials_extended LEFT JOIN text_extractions
            ON oer_materials_extended.id = text_extractions.material_id
        ),

        oer_material_models_transcription AS (
            SELECT
                oer_material_models_text_extraction.*,
                transcriptions.value AS transcription
            FROM oer_material_models_text_extraction LEFT JOIN transcriptions
            ON oer_material_models_text_extraction.id = transcriptions.material_id
        ),

        oer_material_models AS (
            SELECT
                oer_material_models_transcription.*,
                features_public_re_required_wikipedia_concepts.value AS wikipedia_concepts
            FROM oer_material_models_transcription LEFT JOIN features_public_re_required_wikipedia_concepts
            ON oer_material_models_transcription.id = features_public_re_required_wikipedia_concepts.record_id
        )

        SELECT * FROM oer_material_models;`;



    pg.executeLarge(query, [], 10, (error, results, cb) => {
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
                url,
                authors,
                language,
                type: extension,
                mimetype,
                provider_name: provider,
                text_extraction,
                transcription,
                wikipedia_concepts: wikipediaConcepts
            } = material;
            // get raw text from the material
            let rawContent = text_extraction ? text_extraction : transcription;

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
        cb();
    }, (error) => {    // write the material jsons
        if (error) {
            logger.error('error when processing data from postgres', { error: error.message });
            logger.info('closing models and connections');
            x5recommend.close();
            // close the connection with postgres
            logger.info('closed');
        } else {
            logger.info('Processing material models.');
            pg.selectLarge({}, 'rec_sys_material_model', 10, (error, results, cb) => {
                if (error) {
                    logger.error('error when retrieving from postgres', { error: error.message });
                    return;
                }
                for (let material of results) {
                    logger.info(`next record being processed id=${material.id}`);
                    let wikipediaConceptNames   = [];
                    let wikipediaConceptSupport = [];

                    // prepare wikipedia concepts if they exist
                    if (material.concepts) {
                        for (let concept in material.concepts){
                            wikipediaConceptNames.push(concept);
                            wikipediaConceptSupport.push(material.concepts[concept]);
                        }
                    }
                    let url = material.provideruri;
                    let title = material.title;// ? material.title : null;
                    let description = material.description;// ? material.description : null;
                    let provider = material.provider;// ? material.provider : null;
                    let mimetype = material.type;// ? material.type : null;
                    let language = material.language;// ? material.language : null;
                    let record = {
                        url,
                        title,
                        description,
                        provider,
                        mimetype,
                        language,
                        wikipediaConceptNames,
                        wikipediaConceptSupport
                    };

                    // push to the recommendation model
                    console.log(record);
                    x5recommend.pushRecordMaterialModel(record);
                    logger.info(`pushed record with id=${material.id}`, { url });
                }
                cb();
            }, (error) => {
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
                callback();
            });
        }
    });
}

exports.build = build;
