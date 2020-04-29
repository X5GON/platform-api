/** **********************************************
 * Material Preparation Module
 * This module prepares OER materials that were
 * sent via different LMS plugins.
 */

// file type detection/extraction libraries
const mimetypes = require("mime-types");


/**
 * Prepares the moodle request.
 * @param {Object} request - The request containing the material data.
 * @returns {Object} The prepared moodle object.
 */
function _prepareMoodle(request) {
    const {
        title,
        description,
        resurl: material_url,
        rq: provider_uri,
        cid: provider_token,
        author,
        language,
        creation_date,
        mimetype: mime,
        license
    } = request;

    return {
        title,
        provider_uri,
        material_url,
        provider_token,
        language,
        date_created: (new Date(parseInt(creation_date))).toISOString(),
        retrieved_date: (new Date()).toISOString(),
        type: {
            ext: mimetypes.extension(mime),
            mime
        },
        ...(description && { description }),
        ...(author && { author }),
        ...(license && { license }),
        // TODO: additional material metadata
    };
}

/**
 * Prepares the material based on its type.
 * @param {Object} request - The request containing the material data.
 * @returns {Object|Null} The prepared material if existing. Otherwise, null.
 */
function prepare(request) {
    if (request.providertype === "moodle" && request.type === "resource") {
        return _prepareMoodle(request);
    } else {
        return null;
    }
}

module.exports = prepare;
