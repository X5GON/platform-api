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
socket.on('monitor/process', function(msg) {

    // log-lot existing platform processes
    let rows = $('#process-monitor tbody tr[data-process-head]');
    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        // get current row of the process
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
                row.find('td[type=uptime]').html(process.pm2_env.pm_uptime);
                row.find('td[type=created-at]').html(process.pm2_env.created_at_clean);
                row.find('td[type=restart-time]').html(process.pm2_env.restart_time);
                row.find('td[type=unstable-restarts] b').html(process.pm2_env.unstable_restarts);
                if (process.pm2_env.status === 'online') {
                    row.find('td button')
                        .removeClass('btn-success')
                        .addClass('btn-danger')
                        .data('action', 'disable')
                        .html('disable');
                } else {
                    row.find('td button')
                        .removeClass('btn-danger')
                        .addClass('btn-success')
                        .data('action', 'enable')
                        .html('enable');
                }
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
            <tr id="${process.name}" data-process-head="${process.name}">
                <td class="text-center align-middle">${process.pm_id}</td>
                <td class="text-center align-middle" data-toggle="collapse"
                    href="tr[data-process-body=${process.name}] div.collapse">
                    <b class="doc">${process.name}</b>
                </td>
                <td class="text-center align-middle font-weight-bold ${statusColor(process.pm2_env.status)}"
                    type="status">
                    ${process.pm2_env.status}
                </td>
                <td class="text-center align-middle" type="running-time">
                    ${process.pm2_env.running_time}
                </td>
                <td class="text-center align-middle" type="uptime">
                    ${process.pm2_env.pm_uptime}
                </td>
                <td class="text-center align-middle" type="created-at">
                    ${process.pm2_env.created_at_clean}
                </td>
                <td class="text-center align-middle" type="restart-time">
                    ${process.pm2_env.restart_time}
                </td>
                <td class="text-center align-middle" type="unstable-restarts">
                    <b class="doc error">
                        ${process.pm2_env.unstable_restarts}
                    </b>
                </td>

                <td class="text-center align-middle">
                    ${process.pm2_env.status==='online'?
                        `<button type="button" class="btn btn-danger btn-sm"
                            data-action="disable"
                            data-process-id=${process.pm_id}>
                            disable
                        </button>`
                        :
                        `<button type="button" class="btn btn-success btn-sm"
                            data-action="enable"
                            data-process-id=${process.pm_id}>
                            enable
                        </button>`
                    }
                </td>
            </tr>`;
        // add to the end of the body
        tableBody.append(row);

        // enable button function
        $(`#process-monitor tr[data-process-head="${process.name}"] button`).click(function (e) {
            let button = $(this);
            let colorClasses = ['btn-danger', 'btn-success'];
            let actionType = button.data('action') === 'disable' ? 'stop' : 'start';
            let processId = button.data('process-id');
            // make a request
            $.get(`/admin/monitor/api/process/${processId}/${actionType}`, function (data) {
                let oldColorClass = data[0].status === 'stopped' ? colorClasses[0] : colorClasses[1];
                let newColorClass = data[0].status === 'stopped' ? colorClasses[1] : colorClasses[0];
                let action  = data[0].status === 'stopped' ? 'enable' : 'disable';
                // set button specifications
                button.data('action', action);
                button.removeClass(oldColorClass).addClass(newColorClass);
                button.html(action);
            });
        });
    }


});