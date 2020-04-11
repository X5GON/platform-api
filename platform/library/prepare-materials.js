/** **********************************************
 * Material Preparation Module
 * This module prepares OER materials that were
 * sent via different LMS plugins.
 */

// file type detection/extraction libraries
const fileTypeManual = require("mime-types");

/**
 * @class PrepareMaterials
 * @description Prepares the material format from the user activity or other
 * non-crawler requests.
 */
class PrepareMaterials {
    constructor() { }

    /**
     * Prepares the moodle request.
     * @param {Object} request - The request containing the material data.
     * @returns {Object} The prepared moodle object.
     */
    _prepareMoodle(request) {
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
                ext: fileTypeManual.extension(mime),
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
    prepare(request) {
        if (request.providertype === "moodle" && request.type === "resource") {
            return this._prepareMoodle(request);
        } else {
            return null;
        }
    }
}

module.exports = PrepareMaterials;
