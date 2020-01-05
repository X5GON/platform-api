/** ******************************************************************
 * Extract Text Content in Raw Format
 * This component extracts raw content text from the file provided.
 * To do this we use textract <https://github.com/dbashford/textract>
 * which is a text extraction library. It returns the content in raw
 * text.
 */

// basic bolt template
const BasicBolt = require("./basic-bolt");

// external libraries
const textract = require("@library/textract");

class ExtractTextRaw extends BasicBolt {
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
        this._prefix = `[ExtractTextRaw ${this._name}]`;

        // the path to where to get the url
        this._documentLocationPath = config.document_location_path;
        // the path to where to store the text
        this._documentTextPath = config.document_text_path;
        // the path to where to store the error
        this._documentErrorPath = config.document_error_path || "error";
        // the method type is used to extract the content
        this._methodType = null;
        switch (config.document_location_type) {
        case "local":
            this._methodType = "fromFileWithPath";
            break;
        case "remote":
            this._methodType = "fromUrl";
            break;
        default:
            this._methodType = "fromUrl";
            break;
        }

        const {
            preserve_line_breaks,
            preserve_only_multiple_line_breaks,
            include_alt_text
        } = config.textract_config;

        // configuration for textract
        this._textractConfig = {
            ...preserve_line_breaks && { preserveLineBreaks: preserve_line_breaks },
            ...preserve_only_multiple_line_breaks && { preserveOnlyMultipleLineBreaks: preserve_only_multiple_line_breaks },
            ...include_alt_text && { includeAltText: include_alt_text },
        };

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

    receive(message, stream_id, callback) {
        const self = this;

        const materialUrl = self.get(message, this._documentLocationPath);
        const materialText = self.get(message, this._documentTextPath);

        if (materialText) {
            // the material already have the raw text extracted
            return this._onEmit(message, stream_id, callback);
        }
        // extract raw text using the assigned method type
        textract[this._methodType](materialUrl, self._textractConfig, (error, text) => {
            if (error) {
                this.set(message, this._documentErrorPath, `${this._prefix} Not able to extract text: ${error.message}`);
                return this._onEmit(message, "stream_error", callback);
            }
            // save the raw text within the metadata
            this.set(message, this._documentTextPath, text);
            return this._onEmit(message, stream_id, callback);
        });
    }
}

exports.create = function (context) {
    return new ExtractTextRaw(context);
};
