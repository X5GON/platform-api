// initalize listeners on document ready
$(document).ready(function () {
    $('#process-monitor button').click(function (e) {
        let button = $(this);
        let colorClasses = ['btn-danger', 'btn-success'];
        let actionType = button.data('action') === 'disable' ? 'stop' : 'start';
        let processId = button.data('process-id');
        // make a request
        $.get(`/monitor/api/process/${processId}/${actionType}`, function (data) {
            let oldColorClass = data[0].status === 'stopped' ? colorClasses[0] : colorClasses[1];
            let newColorClass = data[0].status === 'stopped' ? colorClasses[1] : colorClasses[0];
            let action  = data[0].status === 'stopped' ? 'enable' : 'disable';
            // set button specifications
            button.data('action', action);
            button.removeClass(oldColorClass).addClass(newColorClass);
            button.html(action);
        });

    });
});