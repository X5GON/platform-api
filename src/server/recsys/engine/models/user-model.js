/************************************************
 * The User Model container.
 * It wraps the search process within the QMiner 
 */

// external modules
const qm = require('qminer');

/**
 * The user model class.
 * @description Contains the information and model of the user.
 */
class UserModel {
    /**
     * Creates the model of the user with `id=userId`.
     * @param {String} userId - The user id.
     * @param {Object} users - QMiner store containing user information.
     */
    constructor(userId, users) {
        // finds the user within the QMiner store
        this.user = users.recordByName(userId);
    }

    /**
     * Gets user id.
     * @returns {String} The user id.
     */
    getId() {
        return this.user.token;
    }

    /**
     * Gets Wikipedia concepts the user is interested in.
     * @returns {Object[]} A list of Wikipedia concepts with their weights indicating
     * the users interests.
     */
    getWikiConcepts() {
        let self = this;
        // get the record set of Wikipedia concepts 
        let wikiConcepts = self.user.viewed.join('content').join('concepts');
        return wikiConcepts.map(concept => ({
            uri: concept.uri,         // uri of concept in original language
            name: concept.name,       // name of concept in original language
            secUri: concept.secUri,   // uri of concept of English Wikipedia
            secName: concept.secName, // name of concept of English Wikipedia
            weight: concept.$fq       // the intensity of the interest
        }));
    }

    /**
     * Gets the OER material the user has viewed.
     * @returns {Object[]} A list of OER material with the the weights indicating the
     * number of times the user viewed it.
     */
    getViewedMaterials() {
        let self = this;
        // get the content the user has viewed
        let viewedContent = self.user.viewed.join('content');
        return viewedContent.map(content => ({
            link: content.link,   // link to the OER material
            type: content.type,   // OER material type
            title: content.title, // OER material title
            weight: content.$fq   // number of times the user viewed the OER material
        }));
    }
}
module.exports = UserModel;