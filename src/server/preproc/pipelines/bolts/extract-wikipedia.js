/** ******************************************************************
 * Extract Wikipedia
 * This component extracts the Wikipedia Concepts from an
 * attribute given and the retrieved message.
 */

// basic bolt template
const BasicBolt = require("./basic-bolt");

/**
 * Extracts wikipedia concepts out of the document content.
 */
class ExtractWikipedia extends BasicBolt {
    constructor() {
        super();
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[ExtractWikipedia ${this._name}]`;

        // wikifier request instance
        this._wikifier = require("@library/wikifier")(config.wikifier);

        // determine the text to use for wikipedia extraction
        this._documentTextPath = config.document_text_path;
        // determine the location to store the concepts
        this._wikipediaConceptPath = config.wikipedia_concept_path;
        // the path to where to store the error
        this._documentErrorPath = config.document_error_path || "error";
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

    async receive(message, stream_id, callback) {
        let self = this;

        try {
            // get the raw text from the material
            let text = self.get(message, this._documentTextPath);

            if (!text) {
                // send it to the next component in the pipeline
                // there was an error - send the material to partial table
                throw new Error("No text provided.");
            }
            // process material text and extract wikipedia concepts
            const { wikipedia } = await self._wikifier.processText(text);
            // retrieve wikifier results
            if (!wikipedia.length) {
                throw new Error("No wikipedia concepts found");
            }

            // store merged concepts within the material object
            self.set(message, this._wikipediaConceptPath, wikipedia);
            return this._onEmit(message, stream_id, callback);
        } catch (error) {
            // there was an error - send the material to partial table
            this.set(message, this._documentErrorPath, `${this._prefix} ${error.message}`);
            return this._onEmit(message, "stream_error", callback);
        }
    }
}

exports.create = function (context) {
    return new ExtractWikipedia(context);
};
