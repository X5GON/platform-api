/**
 * Adds API routes for the recommendations.
 * @param {Object} app - Express app.
 * @param {Object} pg - Postgres connection wrapper.
 * @param {Object} logger - The logger object.
 */
module.exports = function (app, pg, logger) {

    // POST client activity
    app.post('/api/v1/client_activity', (req, res) => {
        // log client activity
        logger.info('client requested to post activity',
            logger.formatRequest(req)
        );

        // get the body of the request
        const body = req.body;

        // TODO: check post schema
        if (true /* && !isValid(body) */) {
            // log postgres error
            logger.error('error [route_body]: client request to post activity failed',
                logger.formatRequest(req, { error: 'The body of the request is not in valid schema' })
            );
            // send error to client
            return req.send({ errors: { msg: 'The body of the request is not in valid schema' } });
        }

        // TODO: store the client activity into postgres
        pg.insert({ /* client activity data */ }, 'client_activity', (error) => {
            if (error) {
                // log postgres error
                logger.error('error [postgres.insert]: client request to post activity failed',
                    logger.formatRequest(req, { error: error.message })
                );
                // send error to client
                return res.send({ errors: { msg: error.message } });
            }
            // TODO: send response to client
            return res.send('ping');
        });
    });

};