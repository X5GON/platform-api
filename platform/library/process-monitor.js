/** **********************************************
 * Node Process Monitor Module
 * This module access the node processes that
 * are running using the pm2 API plugin
 * [http://pm2.keymetrics.io/docs/usage/pm2-api/].
 */


/**
 * Takes the number of milliseconds and converts them
 * into human readable format (days hours minutes seconds).
 * @param {Number} mSeconds - Number of milliseconds.
 * @returns {String} The human readable format.
 */
function msToTime(mSeconds) {
    let ms = mSeconds % 1000;
    mSeconds = (mSeconds - ms) / 1000;
    let secs = mSeconds % 60;
    mSeconds = (mSeconds - secs) / 60;
    let mins = mSeconds % 60;
    mSeconds = (mSeconds - mins) / 60;
    let hrs = mSeconds % 24;
    mSeconds = (mSeconds - hrs) / 24;
    let days = mSeconds;

    // construct string with given values
    let time = [];
    if (days) { time.push(`${days} days`); }
    if (hrs) { time.push(`${hrs}h`); }
    if (mins) { time.push(`${mins}min`); }
    if (secs) { time.push(`${secs}s`); }
    // return the human readable format
    return time.join(" ");
}

class Monitor {
    /**
     * Initialize the Monitor instance. It connects to or
     * creates a pm2 deamon and retrieves a list of processes
     * currently running in the deamon.
     */
    constructor() {
        let self = this;
        // sets the pm2 object used to monitor
        this.pm2 = require("pm2");
        this._connected = false;
        this._processList = [];
        // create new/connect to the pm2 deamon
        this.pm2.connect((error) => {
            if (error) { console.log(error); return; }
            self._connected = true;
            // retrieve the list or running processes
            self.listProcesses((xerror, processes) => {
                if (error) { console.log(xerror); return; }
                self._processList = processes.map((process) => ({
                    name: process.name,
                    pid: process.pid,
                    pm_id: process.pm_id,
                    status: process.pm2_env.status
                }));
            });
        });
    }

    /**
     * Start the process identified by its name.
     * @param {String} processId - The process name to be started.
     * @param {Function} cb - The callback function.
     */
    startProcess(processId, cb) {
        this._checkConnection(cb);
        this._checkProcessExists(processId, cb, (listProcess) => {
            // start the existing process
            this.pm2.start(listProcess.name, (error, process) => {
                if (error) { return cb(error); }
                // fix process info in the list
                if (process) { listProcess.status = process[0].status; }
                return cb(null, process);
            });
        });
    }

    /**
     * Stops the process with the process name.
     * @param {String} processId - The process name to be stopped.
     * @param {Function} cb - The callback function.
     */
    stopProcess(processId, cb) {
        this._checkConnection(cb);
        this._checkProcessExists(processId, cb, (listProcess) => {
            // stop the process
            this.pm2.stop(listProcess.name, (error, process) => {
                if (error) { return cb(error); }
                if (process) { listProcess.status = process[0].status; }
                return cb(null, process);
            });
        });
    }

    /**
     * Restart the process with the process name.
     * @param {String} processId - The process name to be restarted.
     * @param {Function} cb - The callback function.
     */
    restartProcess(processId, cb) {
        this._checkConnection(cb);
        this._checkProcessExists(processId, cb, (listProcess) => {
            // restart the process
            this.pm2.restart(listProcess.name, (error, process) => {
                if (error) { return cb(error); }
                if (process) { listProcess.status = process[0].status; }
                return cb(null, process);
            });
        });
    }

    /**
     * Delete the process with the process
     * @param {String} processId - The process name to be deleted.
     * @param {Function} cb - The callback function.
     */
    deleteProcess(processId, cb) {
        this._checkConnection(cb);
        this._checkProcessExists(processId, cb, (listProcess) => {
            // delete the process
            this.pm2.delete(listProcess.name, (error, process) => {
                if (error) { return cb(error); }
                // remove the process from the list
                for (let idx = 0; idx < this._processList.length; idx++) {
                    if (this._processList[idx].name === listProcess.name) {
                        this._processList.splice(idx, 1); break;
                    }
                }
                return cb(null, process);
            });
        });
    }

    /**
     * Get information of the the process with the process name.
     * @param {String} processId - The process name to get information from.
     * @param {Function} cb - The callback function.
     */
    describeProcess(processId, cb) {
        this._checkConnection(cb);
        this._checkProcessExists(processId, cb, (listProcess) => {
            // get process information
            this.pm2.describe(listProcess.name, (error, description) => {
                if (error) { return cb(error); }
                return cb(null, description);
            });
        });
    }

    /**
     * Get the list of processes saved in pm2 deamon.
     * @param {Function} cb - The callback function.
     */
    listProcesses(cb) {
        this._checkConnection(cb);
        // get the whole list of processes running
        this.pm2.list((error, processes) => {
            if (error) { return cb(error); }
            // TODO: prepare the list of processes
            const cleanList = processes.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
                .map((process) => ({
                    name: process.name,
                    pid: process.pid,
                    pm_id: process.pm_id,
                    monit: process.monit,
                    pm2_env: {
                        status: process.pm2_env.status,
                        created_at: process.pm2_env.created_at,
                        created_at_clean: (new Date(process.pm2_env.created_at)).toUTCString().substr(4),
                        running_time: process.pm2_env.status === "online"
                            ? msToTime(Date.now() - process.pm2_env.created_at) : "",
                        pm_uptime: process.pm2_env.status === "online"
                            ? msToTime(Date.now() - process.pm2_env.pm_uptime) : "",
                        unstable_restarts: process.pm2_env.unstable_restarts,
                        restart_time: process.pm2_env.restart_time,
                        exec_interpreter: process.pm2_env.exec_interpreter,
                        instances: process.pm2_env.instances,
                        pm_exec_path: process.pm2_env.pm_exec_path,
                    }
                }));
            return cb(null, cleanList);
        });
    }

    /**
     * Checks if the pm2 is connected with the deamon.
     * @param {Function} cb - The callback function.
     */
    _checkConnection(cb) {
        if (!this._connected) {
            return cb(new Error("Monitor: not connected"));
        }
    }

    /**
     * Checks if the pm2 process is running.
     * @param {String | Number} processId - The process pm_id or name to be checked if running.
     * @param {Function} cb - The callback function used by the original function.
     * @param {Function} fun - The function executed if the process exists.
     */
    _checkProcessExists(processId, cb, fun) {
        let processExists = false;
        // check if the process exists
        for (let process of this._processList) {
            let compareValue = null;
            if (typeof processId === "string") {
                compareValue = process.name;
            } else if (typeof processId === "number") {
                compareValue = process.pm_id;
            }
            if (compareValue === processId) {
                processExists = true;
                // run the function on the existing process
                fun(process); break;
            }
        }
        if (!processExists) {
            return cb(new Error(`Monitor: process does not exists - ${processId}`));
        }
    }
}

module.exports = Monitor;
