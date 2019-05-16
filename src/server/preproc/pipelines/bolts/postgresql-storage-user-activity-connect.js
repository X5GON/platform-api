/********************************************************************
 * PostgresQL storage process for user activity data
 * This component receives the verified OER material object and
 * stores it into postgresQL database.
 */

// helper for updating user models with the provided activity
const updateUserModels = require('alias:lib/update-user-models');

class PostgresqlStorageUserActivites {

    constructor() {
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[PostgresqlStorageUserActivites ${this._name}]`;

        // create the postgres connection
        this._pg = require('alias:lib/postgresQL')(config.pg);

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
            uuid,
            url,
            referrer: referrer_url,
            visitedOn: timestamp,
            userAgent: user_agent,
            language
        } = message;

        ///////////////////////////////////////////
        // CREATE COOKIES, URLS, USER_ACTIVITIES
        ///////////////////////////////////////////

        // cookie information
        let cookies = {
            uuid,
            user_agent,
            language
        };

        // url logging
        let urls = {
            url
        };

        // user activities information
        let user_activities = {
            referrer_url,
            timestamp
        };

        ///////////////////////////////////////////
        // SAVE COOKIES and URLS
        ///////////////////////////////////////////

        // send cookies and urls into the database
        const cookiePromise = new Promise((resolve, reject) => {
            self._pg.upsert(cookies, { uuid: null }, 'cookies', function (e, res) {
                if (e) { return reject(e); }
                return resolve(res[0].id);
            });
        });

        const urlPromise = new Promise((resolve, reject) => {
            self._pg.upsert(urls, { url: null }, 'urls', function (e, res) {
                if (e) { return reject(e); }
                return resolve(res[0].id);
            });
        });

        ///////////////////////////////////////////
        // SAVE USER ACTIVITY DATA
        ///////////////////////////////////////////

        // create a reference on for the user activities data
        Promise.all([cookiePromise, urlPromise]).then(ids => {
            // user activites reference on other records
            user_activities.cookie_id = ids[0];
            user_activities.url_id    = ids[1];
            // insert user activity data
            self._pg.insert(user_activities, 'user_activities', function (e, res) {
                if (e) { return callback(e); }

                /////////////////////////////////
                // Update User Models
                /////////////////////////////////
                if (uuid.includes('unknown')) {
                    const activity = {
                        uuid,
                        urls: [url]
                    };
                    updateUserModels.updateUserModel(activity);
                }
                // go to next record
                return callback(null);

            });
        }).catch(e => callback(e));

    }
}

exports.create = function (context) {
    return new PostgresqlStorageUserActivites(context);
};