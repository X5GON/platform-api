/**
 * Adds sockets support for dynamic data sending.
 * @param {Object} http - The http express object.
 * @param {Object} monitor - The PM2 monitor object.
 */
module.exports = function (http, monitor) {

    // initialize socket
    let io = require('socket.io')(http);
    // configure socket connections
    io.on('connection', socket => {
        // TODO: setup the socket for connection

        socket.on('disconnect', () => {
            // TODO: cleanup on disconnect
        });

        // send monitor information to the appropriate socket
        setInterval(() => {
            monitor.listProcesses((error, list) => {
                return error ?
                    io.emit('monitor/process/error', { error }) :
                    io.emit('monitor/process', list);
            });
        }, 1000);
});

}