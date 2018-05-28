/********************************************************************
 * Wikification process of the given dataset
 * This component wikifies the OER material using the raw text extracted in the
 * previous steps of the pre-processing pipeline. The wikipedia concepts are then
 * stored within the material object and sent to the next component.
 */

// external modules
const async = require('async');
const request = require('request');
const querystring = require('querystring');

// internal libraries
const Logger = require('../../../lib/logging-handler')();
// create a logger instance for logging wikification process
const logger = Logger.createGroupInstance('wikification', 'preproc');

// configurations
const wikiConfig = require('../config/wikiconfig');

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
            url: `${wikiConfig.wikifierUrl}/annotate-article`, 
            form: {
                text: text,
                lang: 'auto',
                support: false,
                ranges: false,
                includeCosines: false,
                userKey: wikiConfig.userKey,
            },
            timeout: 5 * 60 * 1000 // five minutes
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
                console.log(data);
                console.log(text);
                // error when parsing response
                logger.error('error [wikification.parsing]: unable to parse response', 
                    { error: error.message }
                );
                return callback(error);
            }

            // get found concepts/annotations
            let annotations = data.annotations;
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
                    pageRank: concept.pageRank * weight
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
        const fullText = material.metadata.rawText; // this is just a placeholder
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
                const lastEndChar = textChunk.match(/[\.?!]/gi);
                let cutOffLastWhitespace = textChunk.lastIndexOf(lastEndChar[lastEndChar.length-1]);
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
            material.metadata.wikipediaConcepts = [];
            //send it to the next component in the pipeline
            return this._onEmit(material, stream_id, callback);
        }

        // get wikipedia concepts of the material
        async.parallelLimit(tasks, 10, (error, concepts) => {
            if (error) {
                // there was an error - it was already logged within  
                // the function just end the with a callback
                return callback();
            }

            // `concepts` is an array of arrays - flatten it
            concepts = concepts.reduce((accumulator, currentValue) => 
                accumulator.concat(currentValue), []);

            // concept storage
            let conceptMap = { };
            // merge concepts with matching uri
            for (let concept of concepts) {
                if (conceptMap[concept.uri]) {
                    // concept exists in mapping - add weighted pageRank
                    conceptMap[concept.uri].pageRank += concept.pageRank;
                } else {
                    //  add concept to the mapping
                    conceptMap[concept.uri] = concept;
                }
            }

            // store merged concepts within the material object 
            material.metadata.wikipediaConcepts = Object.values(conceptMap);
            //send it to the next component in the pipeline
            this._onEmit(material, stream_id, callback);
        });
    }
}

exports.create = function (context) { return new Wikification(context); };