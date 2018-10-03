/********************************************************************
 * Wikification process of the given dataset
 * This component wikifies the OER material using the raw text extracted in the
 * previous steps of the pre-processing pipeline. The wikipedia concepts are then
 * stored within the material object and sent to the next component.
 */

// configurations
const config = require('../../../../config/config');

// external modules
const async = require('async');
const request = require('request');

// internal libraries
const Logger = require('../../../../lib/logging-handler')();
// create a logger instance for logging wikification process
const logger = Logger.createGroupInstance('wikification', 'preproc');


/********************************************
 * Helper functions
 *******************************************/

/**
 * Get the wikipedia concepts out of a given text.
 * @param {String} text - The text from which wiki concepts are extracted.
 * @returns {Promise} The promise containing the wiki concepts request.
 * @private
 */
function _wikipediaRequest(text) {
    // create a request promise
    return new Promise((resolve, reject) => {
        request.post({
            url: `${config.preproc.wikifier.wikifierUrl}/annotate-article`,
            support: false,
            includeCosines: true,
            userKey: config.preproc.wikifier.userKey,
            timeout: 30 * 1000 // 30 seconds
        }, (error, response, body) => {
                // handle error on request
                if (error) { return reject(error); }
                // otherwise return the request body
                return resolve(body);
            }
        );
    });
}

/**
 * Extracts wikipedia concepts from the given text.
 * @param {Object} text - The text to be wikified.
 * @param {Object} weight - The weight to be added to the material pageRank. Used
 * when text was sliced into chunks.
 * @param {Function} callback - The function called after all is done.
 */
function enrichMaterial(text, weight, callback) {
    // make wikipedia concept request and handle concepts
    _wikipediaRequest(text)
        .then(data => {
            try {
                // needed to handle strange parsing patterns
                data = JSON.parse(data);
            } catch (error) {
                // error when parsing response
                logger.error('error [wikification.parsing]: unable to parse response',
                    { error: error.message }
                );
                return callback(error);
            }

            // get found concepts/annotations
            let annotations = data.annotations;
            if (!annotations || !annotations.length) {
                // return the concept list
                return callback(null, []);
            }

            // sort annotations by pageRank
            annotations.sort((concept1, concept2) => concept2.pageRank - concept1.pageRank);

            /******************************
             * get top wikipedia concepts
             *****************************/

            // calculate total pageRank from all concepts
            let total = annotations.reduce((sum, currentConcept) =>
                sum + Math.pow(currentConcept.pageRank, 2), 0);

            // get top 80% concepts - noise reduction
            let partial = 0;
            for (let i = 0; i < annotations.length; i++) {
                let annotation = annotations[i];
                partial += Math.pow(annotation.pageRank, 2);
                // if partials is over 80%
                if (partial / total > 0.8) {
                    annotations = annotations.slice(0, i + 1);
                    break;
                }
            }

            /******************************
             * prepare concepts
             *****************************/

            // create concept list
            let concepts = annotations.map(concept => {
                // prepare wiki concept object
                return {
                    uri: concept.url.toString(),
                    name: concept.title.toString(),
                    secUri: concept.secUrl || null,
                    secName: concept.secTitle || null,
                    lang: concept.lang,
                    wikiDataClasses: concept.wikiDataClasses,
                    cosine: concept.cosine,
                    pageRank: concept.pageRank * weight,
                    dbPediaIri: concept.dbPediaIri
                };
            });
            // return the concept list
            return callback(null, concepts);
        })
        .catch(error => {
            // TODO: log error and cleanup lecture object
            logger.error('error [wikification.concepts]: unable to prepare concepts',
                { error: error.message }
            );
            return callback(error);
        });
}

/**
 * Extracts wikipedia concepts out of the OER material.
 */
class Wikification {

    constructor(context) {
        this._name = null;
        this._onEmit = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._onEmit = config.onEmit;
        // use other fields from config to control your execution
        callback();
    }

    heartbeat() {
        // do something if needed
    }

    shutdown(callback) {
        // prepare for gracefull shutdown, e.g. save state
        callback();
    }

    receive(material, stream_id, callback) {
        // TODO: get the raw text from the material
        const fullText = material.materialMetadata.rawText; // this is just a placeholder

        if (!fullText) {
            logger.warn('no raw text found for material', { materialUrl: material.materialUrl });
            //send it to the next component in the pipeline
            return this._onEmit(material, stream_id, callback);
        }

        let tasks = [];
        // split full text for wikification consumption
        let textIndex = 0,          // the text index - how much text was already processed
            maxTextLength = 10000;  // the length of the text chunk

        // go through whole text
        while (fullText.length > textIndex) {
            // get the text chunk
            let textChunk = fullText.substring(textIndex, textIndex + maxTextLength);
            // there is not text to be processed, break the cycle
            if (textChunk.length === 0) { break; }
            if (textChunk.length === maxTextLength) {
                // text chunk is of max length - make a cutoff at last
                // end character to avoid cutting in the middle of sentence
                let cutOffLastWhitespace;

                const lastEndChar = textChunk.match(/[\.?!]/gi);
                if (lastEndChar) {
                    cutOffLastWhitespace = textChunk.lastIndexOf(lastEndChar[lastEndChar.length-1]);
                }
                // if there is not end character detected
                if (!cutOffLastWhitespace) {
                    cutOffLastWhitespace = textChunk.lastIndexOf(' ');
                }
                // if there is not space detected - cut of the whole chunk
                if (!cutOffLastWhitespace) {
                    cutOffLastWhitespace = textChunk.length;
                }

                textChunk = textChunk.substring(0, cutOffLastWhitespace);
                // increment text index
                textIndex += cutOffLastWhitespace;
            } else {
                // we got to the end of text
                textIndex += maxTextLength;
            }
            // calculate the weight we add to the found wikipedia concepts
            let weight = textChunk.length / fullText.length;
            // add a new wikification task on text chunk
            tasks.push((xcallback) => {
                enrichMaterial(textChunk, weight, xcallback);
            });
        }

        if (tasks.length === 0) {
            // there were no tasks generated for the material - skip wikification
            material.materialMetadata.wikipediaConcepts = [];
            //send it to the next component in the pipeline
            return this._onEmit(material, stream_id, callback);
        }

        // get wikipedia concepts of the material
        async.parallelLimit(tasks, 10, (error, concepts) => {
            if (error) {
                // there was an error - it was already logged within the function
                // just end the with a callback
                logger.warn('unable to retrieve concepts', { materialUrl: material.materialUrl });
                return this._onEmit(material, stream_id, callback);
            }

            // concept storage
            let conceptMap = { };
            // merge concepts with matching uri
            for (let conceptsBundle of concepts) {
                for (let concept of conceptsBundle) {
                    if (conceptMap[concept.uri]) {
                        // concept exists in mapping - add weighted pageRank
                        conceptMap[concept.uri].pageRank += concept.pageRank;
                    } else {
                        //  add concept to the mapping
                        conceptMap[concept.uri] = concept;
                    }
                }
            }
            // store merged concepts within the material object
            material.materialMetadata.wikipediaConcepts = Object.values(conceptMap);

            if (!material.language) {
                // get the dominant language of the material
                let languages = { };
                for (let concept of material.materialMetadata.wikipediaConcepts) {
                    if (languages[concept.lang]) {
                        languages[concept.lang] += 1;
                    } else {
                        languages[concept.lang] = 1;
                    }
                }
                // get the maximum language
                material.language = Object.keys(languages)
                    .reduce((a, b) => languages[a] > languages[b] ? a : b);
            }


            //send it to the next component in the pipeline
            logger.info('acquired wikipedia concepts for material', { materialUrl: material.materialUrl });
            return this._onEmit(material, stream_id, callback);
        });
    }
}

exports.create = function (context) { return new Wikification(context); };