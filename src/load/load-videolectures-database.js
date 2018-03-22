/********************************************************************
 * Load Videolectures Database
 * This script loads the lectures file, located in the 'data/videolectures' 
 * folder, enriches it with wikipedia concepts and stores it in the qminer
 * database. 
 * It is used for the initial loading of videolectures.net dataset. Later
 * it will become deprecated for the use of OER material importing.
 */

// external modules
const fs = require('fs');
const qm = require('qminer');
const async = require('async');
const request = require('request');
const querystring = require('querystring');

// internal modules
const Logger = require('../lib/utils/logging-handler')();

// configurations
const wikiConfig = require('../config/wikiconfig');

// create a logger instance for logging recommendation requests
const logger = Logger.createGroupInstance('recommendation-model-build', 'x5recommend');

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
        // set request options
        const options = {
            'text': text,
            'lang': 'auto',
            'out': 'extendedJson',
            'jsonForEval': 'true',
            'userKey': wikiConfig.userKey
        };
        request(`${wikiConfig.wikifierUrl}/annotate-article?${querystring.stringify(options)}`, 
            (error, response, body) => {
                // handle error on request
                if (error) { return reject(error); }
                // otherwise return the request body
                return resolve(body);
            }
        );
    });
}

/**
 * Adds wikipedia concepts to the 
 * @param {Object} lecture - The lecture object.
 * @param {Function} callback - The function called after all is done.
 */
function enrichLecture(lecture, callback) {
    // prepare text from wiki concepts extraction
    let text = '';
    if (lecture.title) { text += lecture.title + '\n'; }
    if (lecture.description) { text += lecture.description + '\n'; }
    // make wikipedia concept request and handle concepts
    _wikipediaRequest(text)
        .then(data => {
            try {
                // needed to handle strange parsing patterns
                data = JSON.parse(data);
            } catch (error) {
                // error when parsing response
                logger.error('error [wikipedia.parsing]: unable to parse response', 
                    { error: error.message }
                );
                return callback(null, lecture);
            }

            // get found concepts/annotations
            let annotations = data.annotations;
            // sort annotations by pageRank
            annotations.sort((concept1, concept2) => concept2.pageRank - concept1.pageRank);

            /**************************
             * get top wiki concepts
             *************************/

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
            
            /**************************
             * prepare concepts
             *************************/

            // create concept list
            let concepts = annotations.map(concept => {
                // prepare wiki concept object
                let obj = {
                    uri: concept.url,
                    name: concept.title,
                    secName: concept.secTitle,
                    secUri: concept.secUrl
                };
                return obj;
            });
            
            lecture.concepts = concepts;
            callback(null, lecture);
        })
        .catch(error => {
            // TODO: log error and cleanup lecture object
            logger.error('error [wikipedia.concepts]: unable to prepare concepts', 
                { error: error.message }
            );
            callback(error);
        });
}


/********************************************
 * Run Script
 *******************************************/

// initialize database
let x5recommend = new (require('../lib/x5recommend'))({
    mode: 'createClean',
    path: '../../data/x5recommend'
});

// get lectures data
const lecturesFIn = qm.fs.openRead('../../data/videolectures/lectures.json');

// store tasks that need to be done
let tasks = [];

// iterate through every lecture
while (!lecturesFIn.eof) {
    // read line and parse - lecture info
    let lecture = JSON.parse(lecturesFIn.readLine());
    /** 
     * Example lecture: 
     * { 
     *  "id":21317,
     *  "slug":"11nanodan2014_ljubljana",
     *  "time":"2014-05-09T09:00:00Z",
     *  "type":"evt",
     *  "title":"11. nanotehnološki dan 2014, Ljubljana",
     *  "enabled":true,
     *  "public":true,
     *  "description":"9. maja 2014, je **odbor za znanost in tehnologijo**, ..."
     *  "sync":true,
     *  "language":"en",
     *  "videos":[],
     *  "parent":{"id":12931,"type":"prj","slug":"ozs"},
     *  "img":"http://hydro.ijs.si/v00f/86/q3pp6tw4jeuee73uqt3sgq54oruzt3cd.jpg",
     *  "authors":[],
     *  "view_ctr":0,
     *  "duration":null,
     *  "flag":"http://static.videolectures.net/r.1483388978/flags/uk.gif",
     *  "eventdata":{"ordering":"order_index","as_series":false},
     *  "child_num":8,
     *  "cta":null
     * }
     */

    if (!(lecture.enabled && lecture.public)) {
        // lecture is not enabled or public 
        // thus not open to watch
        continue;
    }

    // prepare record out of lecture
    let record = {
        link: `http://videolectures.net/${lecture.slug}/`,
        type: 'video',
        title: lecture.title,
        description: lecture.description,
        created: lecture.time,
        authors: lecture.authors,
        provider: 'videolectures.net',
        languages: [lecture.language]
    };
    // set a list of enriching tasks
    tasks.push(xcallback => enrichLecture(record, xcallback));
}

// run all tasks
async.parallelLimit(tasks, 5, (error, results) => {
    for (let lecture of results) {
        // feed the recommender database
        let numberOfLectures = x5recommend.pushRecordContent(lecture);
        console.log(numberOfLectures);
    }
    // create recommendation models 
    x5recommend.createModels();
    // close database
    x5recommend.close();
});

// close files and databases
lecturesFIn.close();