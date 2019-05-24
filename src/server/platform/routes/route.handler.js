/**
 * @description Adds API routes to express app.
 * @param {Object} app - Express app.
 * @param {Object} pg - Postgres wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (app, pg, logger, config, passport, monitor) {

    ////////////////////////////////////////
    // API Routes
    ////////////////////////////////////////

    // service REST API
    app.use('/api/v1', require('./v1/connect/connect')(pg, logger, config));
    app.use('/api/v1', require('./v1/connect/transitions')(pg, logger, config));

    // search REST API
    app.use('/api/v1', require('./v1/search/search')(pg, logger, config));

    // upload REST API
    app.use('/api/v1', require('./v1/upload/oer-materials')(pg, logger,config));

    // query REST API
    app.use('/api/v1', require('./v1/query/oer-materials')(pg, logger, config));
    app.use('/api/v1', require('./v1/query/oer-providers')(pg, logger, config));
    app.use('/api/v1', require('./v1/query/user-activities')(pg, logger, config));





    ////////////////////////////////////////
    // Website routes
    ////////////////////////////////////////

    app.use('/', require('./v1/admin/admin')(pg, logger, config, passport));
    // app.use('/', require('./v1/admin/monitor')(monitor, config));
    app.use('/', require('./v1/website')(pg, logger, config));


    ////////////////////////////////////////
    // Catching all false requests
    ////////////////////////////////////////

    app.get('/*', (req, res) => {
        // error in website request
        logger.warn('error in website request', logger.formatRequest(req));
        return res.render('error', { title: '404' });
    });
};