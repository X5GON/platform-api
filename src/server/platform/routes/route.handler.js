/**
 * @description Adds API routes to express app.
 * @param {Object} app - Express app.
 * @param {Object} pg - Postgres wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (app, pg, logger, monitor) {

    ////////////////////////////////////////
    // API Routes
    ////////////////////////////////////////

    app.use('/', require('./v1/website')(pg, logger));                  // website routes
    app.use('/api/v1', require('./v1/search')(pg, logger));             // search API routes
    app.use('/api/v1', require('./v1/activity-logging')(pg, logger));   // logging API routes
    app.use('/', require('./v1/monitor')(pg, logger, monitor));         // monitor API routes

    app.get('/*', (req, res) => {
        return res.render('error', { title: '404' });
    });


};