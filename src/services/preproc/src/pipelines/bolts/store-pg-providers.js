/** ******************************************************************
 * PostgresQL storage process for user activity data
 * This component receives the verified OER material object and
 * stores it into postgresQL database.
 */

class StorePGProviders {
    constructor() {
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[StorePGProviders ${this._name}]`;

        // create the postgres connection
        this._pg = require("@library/postgresQL")(config.pg);

        callback();
    }

    heartbeat() {
        // do something if needed
    }

    shutdown(callback) {
        // close connection to postgres database
        this._pg.close();
        // shutdown component
        callback();
    }

    receive(message, stream_id, callback) {
        let self = this;

        // get sent values
        const {
            name,
            domain,
            contact,
            token
        } = message;

        // /////////////////////////////////////////
        // SAVE COOKIES and URLS
        // /////////////////////////////////////////

        self._pg.upsert({
            name, domain, contact, token
        }, { token: null }, "providers", (e, res) => {
            if (e) { return callback(e); }
            // go to next record
            return callback(null);
        });
    }
}

exports.create = function (context) {
    return new StorePGProviders(context);
};
