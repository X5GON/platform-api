/********************************************************************
 * Extraction: Wikification
 * This component wikifies the OER material using the raw text extracted in the
 * previous steps of the pre-processing pipeline. The wikipedia concepts are then
 * stored within the material object and sent to the next component.
 */

// external modules
const async = require('async');
const rp = require('request-promise-native');


class Wikification {

    constructor(userKey, wikifierUrl) {
        this._userKey = userKey;
        this._wikifierUrl = wikifierUrl;
    }


    /**
     * @description Extracts wikipedia concepts out of text.
     * @param {String} text - The text being wikified.
     * @param {Function} callback - The function called when wikifier returns the wikipedia
     * concepts and language.
     */
    processText(text, callback) {
        let self = this;

        // separate text and prepare tasks for retrieving wiki concepts
        let tasks = self._prepareWikificationTasks(text, 10000);

        if (tasks.length === 0) {
            // there is nothing to extract - return empty objects
            return callback(null, { wikipediaConcepts: [], language: null });
        }

        // get wikipedia concepts of the material
        async.parallelLimit(tasks, 10, (error, concepts) => {
            if (error) { return callback(error); }

            // wikipedia concepts storage
            let conceptMap = { };

            // merge concepts with matching uri
            for (let conceptsBundle of concepts) {
                for (let concept of conceptsBundle) {
                    if (conceptMap[concept.uri]) {
                        // concept exists in mapping - add weighted pageRank
                        conceptMap[concept.uri].pageRank   += concept.pageRank;
                        conceptMap[concept.uri].cosine     += concept.cosine;
                        conceptMap[concept.uri].supportLen += concept.supportLen;

                    } else {
                        //  add concept to the mapping
                        conceptMap[concept.uri] = concept;
                    }
                }
            }
            // store merged concepts within the material object
            const wikipediaConcepts = Object.values(conceptMap);

            // get the dominant language of the material
            let languages = { };
            for (let concept of wikipediaConcepts) {
                if (languages[concept.lang]) {
                    languages[concept.lang] += 1;
                } else {
                    languages[concept.lang] = 1;
                }
            }

            // get the maximum language
            const language = Object.keys(languages)
                .reduce((a, b) => languages[a] > languages[b] ? a : b);

            return callback(null, { wikipediaConcepts, language });
        });
    }

    /////////////////////////////////////////////
    // Helper methods
    /////////////////////////////////////////////

    /**
     * @description Get the wikipedia concepts out of a given text.
     * @param {String} text - The text from which wiki concepts are extracted.
     * @returns {Promise} The promise containing the wiki concepts request.
     * @private
     */
    _wikipediaRequest(text) {
        let self = this;

        // create a wikifier request promise object
        return new Promise((resolve, reject) => {
            rp({
                method: 'POST',
                url: `${self._wikifierUrl}/annotate-article`,
                body: {
                    text: text,
                    lang: 'auto',
                    support: true,
                    ranges: false,
                    includeCosines: true,
                    userKey: self._userKey,
                    nTopDfValuesToIgnore: 50,
                    nWordsToIgnoreFromList: 50
                },
                json: true
            })
            .then(body => resolve(body))
            .catch(error => reject(error));
        });
    }


    /**
     * @description Extracts wikipedia concepts from the given text.
     * @param {Object} text - The text to be wikified.
     * @param {Object} weight - The weight to be added to the material
     * pageRank. Used when text was sliced into chunks.
     * @param {Function} callback - The function called after all is done.
     */
    _enrichMaterial(text, weight, callback) {
        let self = this;

        // make wikipedia concept request and handle concepts
        self._wikipediaRequest(text).then(data => {

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
                    cosine: concept.cosine * weight,
                    pageRank: concept.pageRank * weight,
                    dbPediaIri: concept.dbPediaIri,
                    supportLen: concept.supportLen
                };
            });
            // return the concept list
            return callback(null, concepts);
        }).catch(error => {
            // TODO: log error and cleanup lecture object
            return callback(error);
        });
    }


    /**
     * @description Splits the full text into smaller chunks and prepares
     * tasks to be sent to wikifier.
     * @param {String} text - The full text to be sent to wikifier.
     * @param {Number} maxTextLength - The maximum text length to be sent
     * to wikifier.
     * @returns {Function[]} Array of tasks.
     */
    _prepareWikificationTasks(text, maxTextLength) {
        let self = this;

        let tasks = [];
        let textIndex = 0;
        // go through whole text
        while (text.length > textIndex) {
            // get the text chunk
            let textChunk = text.substring(textIndex, textIndex + maxTextLength);
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
            let weight = textChunk.length / text.length;
            // add a new wikification task on text chunk
            tasks.push((callback) => {
                self._enrichMaterial(textChunk, weight, callback);
            });
        }
        return tasks;
    }
}



/**
 * Extracts wikipedia concepts out of the OER material.
 */
class ExtractionWikipedia {

    constructor() {
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[Wikification ${this._name}]`;

        // wikifier request object
        this._wikifier = new Wikification(config.userKey, config.wikifierUrl);

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
        let self = this;

       // get the raw text from the material
        const fullText = material.materialMetadata.rawText;

        if (!fullText) {
            //send it to the next component in the pipeline
            return this._onEmit(material, 'stream_partial', callback);
        }

        // process material text and extract wikipedia concepts
        self._wikifier.processText(fullText, (e, response) => {
            if (e) {
                // there was an error - send the material to partial table
                return this._onEmit(material, 'stream_partial', callback);
            }

            // retrieve wikifier results
            const { wikipediaConcepts, language } = response;

            if (!wikipediaConcepts.length) {
                // no wikipedia concepts extracted - send it to partial material table
                return this._onEmit(material, 'stream_partial', callback);
            }

            // store merged concepts within the material object
            material.materialMetadata.wikipediaConcepts = wikipediaConcepts;
            // assign the missing language using the wikifier autodetect
            if (!material.language) { material.language = language; }

            //send it to the next component in the pipeline
            return this._onEmit(material, stream_id, callback);
        });
    }
}

exports.create = function (context) {
    return new ExtractionWikipedia(context);
};