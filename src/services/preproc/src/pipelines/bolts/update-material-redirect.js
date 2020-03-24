/** ******************************************************************
 * PostgresQL storage process for user activity data
 * This component receives the verified OER material object and
 * stores it into postgresQL database.
 */

const mimetypes = require("@config/mimetypes");

class UpdateRedirect {
    constructor() {
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[UpdateRedirect ${this._name}]`;
        callback();
    }

    heartbeat() {
        // do something if needed
    }

    shutdown(callback) {
        // shutdown component
        callback();
    }

    receive(material, stream_id, callback) {
        let {
            mimetype,
            retrieved_date
        } = material;

        let date = new Date(retrieved_date);
        // check if the video and audio materials were retrieved before 2019-07-01
        let limitDate = new Date("2019-08-01");
        if (mimetypes.video.includes(mimetype) && date < limitDate) {
            stream_id = "video";
        } else if (mimetypes.audio.includes(mimetype) && date < limitDate) {
            stream_id = "video";
        } else if (mimetypes.text.includes(mimetype)) {
            stream_id = "text";
        } else {
            // the materials are recent, end process
            stream_id = "updated";
        }
        // redirect the material
        return this._onEmit(material, stream_id, callback);
    }
}

exports.create = function (context) {
    return new UpdateRedirect(context);
};
