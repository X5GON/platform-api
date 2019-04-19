/**
 * Determines the color class based on the process status.
 * @param {String} status - The status of the process.
 * @returns {String} The bootstrap color class associated with the status.
 */
function statusColor(status) {
    return status === 'online' ? 'text-success' :
        status === 'launching' ? 'text-warning' :
        'text-danger';
}

let socket = io();
// get process monitor information
socket.on('monitor-process', function(msg) {

    // get existing processes
    let rows = $('#process-monitor tbody tr[data-process-head]');
    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        let row = $(rows[rowIdx]);
        let processExists = false;
        for (let processIdx = 0; processIdx < msg.length; processIdx++) {

            let process = msg[processIdx];

            if(row.attr('id') === process.name) {
                // change the values of the existing process
                processExists = true;
                // change status values
                let status = row.find('td[type=status]');

                if (process.pm2_env.status !== status.html()) {
                    // change status text color
                    let oldStatusColor = statusColor(status.html());
                    let newStatusColor = statusColor(process.pm2_env.status);
                    status.removeClass(oldStatusColor).addClass(newStatusColor);
                    // change status text
                    status.html(process.pm2_env.status);
                }

                // change other values
                row.find('td[type=running-time]').html(process.pm2_env.running_time);
                row.find('td[type=created-at]').html(process.pm2_env.created_at_clean);
                row.find('td[type=restart-time]').html(process.pm2_env.restart_time);
                row.find('td[type=unstable-restarts]').html(process.pm2_env.unstable_restarts);

                // remove process from the process list
                msg.splice(processIdx, 1);
                break;
        }
        }

        // if the process does not exist remove table row
        if(!processExists) {
            let processName = row.data('process-head');
            $(`#process-monitor tr[data-process-body="${processName}"]`).remove();
            row.remove();
        }
    }

    // add new processes to the table
    // these were not deleted from the list
    let tableBody = $('#process-monitor tbody');
    for (let process of msg) {
        let row = `
            <tr id="${process.name}">
                <td class="text-center">${process.pm_id}</td>
                <td>${process.name}</td>
                <td class="text-center font-weight-bold ${statusColor(process.pm2_env.status)}"
                type="status">
                ${process.pm2_env.status}
                </td>
                <td class="text-center" type="running-time">${process.pm2_env.running_time}</td>
                <td class="text-center" type="created-at">${process.pm2_env.created_at_clean}</td>
                <td class="text-center">${process.pm2_env.exec_interpreter}</td>
                <td class="text-center" type="restart-time">${process.pm2_env.restart_time}</td>
                <td class="text-center" type="unstable-restarts">${process.pm2_env.unstable_restarts}</td>
            </tr>`;
        // add to the end of the body
        tableBody.append(row);
    }

});