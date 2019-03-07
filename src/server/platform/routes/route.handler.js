/**
 * @description Adds API routes to express app.
 * @param {Object} app - Express app.
 * @param {Object} pg - Postgres wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (app, pg, logger, config, monitor) {

    ////////////////////////////////////////
    // API Routes
    ////////////////////////////////////////

    // service REST API
    app.use('/api/v1', require('./v1/connect/connect')(pg, logger, config));

    // search REST API
    app.use('/api/v1', require('./v1/recommender/search')(pg, logger, config));

    // storing REST API
    app.use('/api/v1/storing', require('./v1/storing/selections')(pg, logger, config));
    app.use('/api/v1/storing', require('./v1/storing/transitions')(pg, logger, config));

    // query REST API
    app.use('/api/v1', require('./v1/query/oer-materials')(pg, logger, config));
    app.use('/api/v1', require('./v1/query/oer-providers')(pg, logger, config));
    app.use('/api/v1', require('./v1/query/user-activities')(pg, logger, config));

    // website routes
    app.use('/', require('./v1/monitor')(monitor, config));
    app.use('/', require('./v1/website')(pg, logger, config));

    // error routes
    app.get('/*', (req, res) => {
        return res.redirect('/error');
    });
};