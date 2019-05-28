// external modules
const router = require('express').Router();

/**
 * @description Adds API routes for platform website requests.
 * @param {Object} pg - Postgres connection wrapper.
 * @param {Object} logger - The logger object.
 * @param {Object} config - The configuration object.
 */
module.exports = function (pg, logger, config, passport, monitor) {


    function _checkAuthentication(req, res, next) {
        // if user is authenticated in the session, carry on
        if (req.isAuthenticated()) { return next(); }
        // they aren't, redirect them to the admin login
        res.redirect('/admin-login');
    }


    /**
     * Fixes and formats the number to show its value in an abbriviated form.
     * @param {Number} number - The number to be formated.
     * @returns {String} The formated number.
     */
    function numberFormat(number) {
        // get the quotient of different values
        const billions = number / 1000000000;
        const millions = number / 1000000;
        const thousands = number / 1000;

        /**
         * Fixes the number based on its value.
         * @param {Number} number - The number to be fixed.
         * @returns {String} The fixed number.
         */
        function toFixed(number) {
            return number <= 10 ? number.toFixed(2) :
                number <= 100 ? number.toFixed(1) :
                number.toFixed(0);
        }
        // format based on the quotient
        if (billions>= 1) {
            return `${toFixed(billions)}B`;
        } else if (millions>= 1) {
            return `${toFixed(millions)}M`;
        } else if (thousands >= 1) {
            return `${toFixed(thousands)}k`;
        } else {
            return number;
        }
    }


    /**********************************
     * Admin login and main page
     *********************************/


    router.get('/admin-login', (req, res) => {
        // if user is authenticated in the session, continue to admin
        if (req.isAuthenticated()) {
            return res.redirect('/admin');
        }

        // return the admin login page
        return res.render('admin-login', {
            layout: 'admin-submain',
            title: 'Admin Login',
            message: req.flash('error')
        });
    });


    router.post('/admin-login',
        // return the admin login page
        passport.authenticate('local', {
            successRedirect: '/admin',
            failureRedirect: '/admin-login',
            failureFlash: 'Invalid username or password.'
        })
    );


    router.get('/admin-logout', (req, res) => {
        req.logout();
        res.redirect('/');
    });


    router.get('/admin', _checkAuthentication, (req, res) => {

        /**
         * Gets the statistics of the given data type.
         * @param {String} type - The type of data to select.
         * @returns {Promise} The promise of the data type statistics.
         */
        function retrieveStats(type) {
            return new Promise((resolve, reject) => {
                pg.selectCount({}, type, (error, results) => {
                    if (error) { return reject(error); }
                    results[0] = {
                        ...results[0],
                        type,
                        count: parseInt(results[0].count)
                    };
                    return resolve(results[0]);
                });
            });
        }

        // get number of materials, user activity data and unique users
        const materialCount = retrieveStats('oer_materials');
        const userActivitesCount = retrieveStats('user_activities');
        const cookiesCount = retrieveStats('cookies');

        Promise.all([materialCount, userActivitesCount, cookiesCount]).then(stats => {

            // return the admin homepage
            return res.render('admin-homepage', {
                layout: 'admin',
                title: 'Admin',
                stats: {
                    oer_materials: numberFormat(stats[0].count),
                    user_activities: numberFormat(stats[1].count),
                    unique_users: numberFormat(stats[2].count)
                }
            });
        }).catch(error => {

            // return the admin homepage
            return res.render('admin-homepage', {
                layout: 'admin',
                title: 'Admin'
            });
        });

    });


    /**********************************
     * Admin OER providers
     *********************************/

    router.get('/admin/oer_providers', _checkAuthentication, (req, res) => {
        /**
         * Gets the API keys from database.
         * @returns {Promise} The promise of the API keys data.
         */
        function retrieveProviders() {
            return new Promise((resolve, reject) => {
                pg.selectProviderStats(null, (error, results) => {
                    if (error) { return reject(error); }
                    // return the results
                    return resolve(results);
                });
            });
        }
        // get the API keys
        const providers = retrieveProviders();

        providers.then(bundles => {
            // get bundle statistics
            const stats = {
                oer_materials: numberFormat(
                    bundles.map(provider => provider.material_count)
                        .reduce((sum, acc) => sum + acc, 0)
                ),
                user_activities: numberFormat(
                    bundles.map(provider => provider.visit_count)
                        .reduce((sum, acc) => sum + acc, 0)
                )
            };

            // render the page
            return res.render('admin-oer-providers', {
                layout: 'admin',
                title: 'OER Providers',
                providers: bundles,
                stats
            });
        }).catch(error => {
            // render the page
            return res.render('admin-oer-providers', {
                layout: 'admin',
                title: 'OER Providers',
                error
            });
        });

    });


    /**********************************
     * Admin API Key
     *********************************/

    /**
     * Prepares the API key instance for consumption by formating the date_created
     * and permissions attributes.
     * @param {Object} instance - The API key object.
     * @returns {Object} The `instance` object with the prepared values.
     */
    function prepareAPIKeyData(instance) {
        // beautify the date created value
        instance.date_created = (new Date(instance.date_created)).toUTCString().substr(4);
        // beautify the permission list
        instance.permissions = Object.keys(instance.permissions)
            .map(key => `${key}[${instance.permissions[key].join(',')}]`)
            .join('\n');
        // return the instance
        return instance;
    }


    router.get('/admin/api_keys', _checkAuthentication, (req, res) => {
        /**
         * Gets the API keys from database.
         * @returns {Promise} The promise of the API keys data.
         */
        function retrieveAPIKeys() {
            return new Promise((resolve, reject) => {
                pg.select({}, 'api_keys', (error, results) => {
                    if (error) { return reject(error); }
                    results.forEach(prepareAPIKeyData);
                    return resolve(results);
                });
            });
        }
        // get the API keys
        const apiKeys = retrieveAPIKeys();

        apiKeys.then(bundles => {
            // render the page
            return res.render('admin-api-keys', {
                layout: 'admin',
                title: 'Platform API Keys',
                apiKeys: bundles
            });
        }).catch(error => {
            // render the page
            return res.render('admin-api-keys', {
                layout: 'admin',
                title: 'Platform API Keys',
                error
            });
        });

    });


    router.post('/admin/api_keys/api/create', _checkAuthentication, (req, res) => {
        const { owner } = req.body;

        // validate that the owner is a string
        if (typeof owner !== 'string') {
            return res.status(400).send({ error: 'owner parameter is not a string' });
        }

        /**
         * Generates a 40 character long API key.
         * @returns {String} The 40 character long API key.
         */
        function generateUUID() {
            let time = new Date().getTime();
            const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxxxxxx'.replace(/[xy]/g, char => {
                let hash = (time + Math.random() * 16) % 16 | 0;
                time = Math.floor(time / 16);
                return (char === 'x' ? hash : (hash & 0x3 | 0x8)).toString(16);
            });
            return uuid;
        }

        /**
         * Deletes the API keys from database.
         * @param {Integer} id - The id of the API key to delete.
         * @returns {Promise} The promise of the API keys data will be deleted.
         */
        function insertAPIKey({ owner, key, permissions }) {
            return new Promise((resolve, reject) => {
                pg.insert({ owner, key, permissions }, 'api_keys', (error, results) => {
                    if (error) { return reject(error); }
                    results.forEach(prepareAPIKeyData);
                    return resolve(results);
                });
            });
        }

        // create user API key object
        const userAPIKey = {
            owner,
            key: generateUUID(),
            permissions: {
                upload: ['materials']
            }
        };

        // delete the API keys
        const apiKeys = insertAPIKey(userAPIKey);

        apiKeys.then(results => {
            return res.status(200).send(results);
        }).catch(error => {
            return res.status(400).send({ error: 'Unable to create API key' });
        });
    });


    router.get('/admin/api_keys/api/:id/delete', _checkAuthentication, (req, res) => {
        const id = parseInt(req.params.id);
        /**
         * Deletes the API keys from database.
         * @param {Integer} id - The id of the API key to delete.
         * @returns {Promise} The promise of the API keys data will be deleted.
         */
        function deleteAPIKeys(id) {
            return new Promise((resolve, reject) => {
                pg.delete({ id }, 'api_keys', (error, results) => {
                    if (error) { return reject(error); }
                    return resolve(results);
                });
            });
        }
        // delete the API keys
        const apiKeys = deleteAPIKeys(id);

        apiKeys.then(results => {
            return res.status(200).send(results);
        }).catch(error => {
            return res.status(400).send({ error: 'Unable to delete API key' });
        });
    });

    /**********************************
     * Admin Monitor Process
     *********************************/

    router.get('/admin/monitor/process', _checkAuthentication, (req, res) => {
        // currently redirect to form page
        monitor.listProcesses((error, processList) => {
            return res.render('admin-monitor-process', {
                layout: 'admin',
                title: 'Process Monitor',
                processList
            });
        });
    });

    /**
     * @api {GET} /monior/api/process/:id/stop Monitor stop process
     * @apiDescription Stop the process with the given process id
     * @apiPrivate
     * @apiName GetMonitorStopId
     * @apiGroup Monitor
     *
     * @apiParam {String} id - The id of the process.
     */
    router.get('/admin/monitor/api/process/:id/stop', _checkAuthentication, (req, res) => {
        const id = parseInt(req.params.id);
        monitor.stopProcess(id, (error, status) => {
            if (error) { return res.status(400).send({ error: error.message }); }
            return res.status(200).send(status);
        });
    });

    /**
     * @api {GET} /monitor/api/process/:id/start Monitor start process
     * @apiDescription Starts the process with the given process id
     * @apiPrivate
     * @apiName GetMonitorStartId
     * @apiGroup Monitor
     *
     * @apiParam {String} id - The id of the process.
     */
    router.get('/admin/monitor/api/process/:id/start', _checkAuthentication, (req, res) => {
        const id = parseInt(req.params.id);
        monitor.startProcess(id, (error, status) => {
            if (error) { return res.status(400).send({ error: error.message }); }
            return res.status(200).send(status);
        });
    });


    /**********************************
     * Admins List
     *********************************/

    /**
     * Prepares the admin instance for consumption by creating the password_hidden
     * attribute.
     * @param {Object} instance - The admin object.
     * @returns {Object} The `instance` object with the prepared values.
     */
    function prepareAdmins(instance) {
        // beautify the date created value
        // beautify the permission list
        instance.password_hidden = instance.password.replace(/./g, '*');
        // return the instance
        return instance;
    }

    router.get('/admin/list', _checkAuthentication, (req, res) => {
        /**
         * Gets the API keys from database.
         * @returns {Promise} The promise of the API keys data.
         */
        function retrieveAdminList() {
            return new Promise((resolve, reject) => {
                pg.select({}, 'admins', (error, results) => {
                    if (error) { return reject(error); }
                    results.forEach(prepareAdmins)
                    return resolve(results);
                });
            });
        }
        // get the API keys
        const admins = retrieveAdminList();

        admins.then(bundles => {
            // currently redirect to form page
            return res.render('admin-list', {
                layout: 'admin',
                title: 'Admin List',
                admins: bundles
            });
        });
    });


    router.post('/admin/list/api/create', _checkAuthentication, (req, res) => {
        const { username, password } = req.body;

        // validate that the owner is a string
        if (typeof username !== 'string') {
            return res.status(400).send({ error: 'username parameter is not a string' });
        } else if (typeof password !== 'string') {
            return res.status(400).send({ error: 'password parameter is not a string' });
        }

        /**
         * Deletes the API keys from database.
         * @param {Integer} id - The id of the API key to delete.
         * @returns {Promise} The promise of the API keys data will be deleted.
         */
        function insertAdmin({ username, password }) {
            return new Promise((resolve, reject) => {
                pg.insert({ username, password }, 'admins', (error, results) => {
                    if (error) { return reject(error); }
                    results.forEach(prepareAdmins);
                    return resolve(results);
                });
            });
        }

        // create user API key object
        const newAdmin = {
            username,
            password
        };

        // delete the API keys
        const admin = insertAdmin(newAdmin);

        admin.then(results => {
            return res.status(200).send(results);
        }).catch(error => {
            return res.status(400).send({ error: 'Unable to create admin' });
        });
    });


    router.get('/admin/list/api/:id/delete', _checkAuthentication, (req, res) => {
        const id = parseInt(req.params.id);
        /**
         * Deletes the API keys from database.
         * @param {Integer} id - The id of the API key to delete.
         * @returns {Promise} The promise of the API keys data will be deleted.
         */
        function deleteAdmin(id) {
            return new Promise((resolve, reject) => {
                pg.delete({ id }, 'admins', (error, results) => {
                    if (error) { return reject(error); }
                    return resolve(results);
                });
            });
        }
        // delete the API keys
        const admin = deleteAdmin(id);

        admin.then(results => {
            return res.status(200).send(results);
        }).catch(error => {
            return res.status(400).send({ error: 'Unable to delete admin' });
        });
    });


    return router;
}
