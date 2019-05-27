// initalize listeners on document ready
$(document).ready(function () {

    function bindFuncToApiKeysButton(e) {
        let button = $(this);
        let actionType = button.data('action');

        if (actionType === 'delete') {
            let apiKeyId = button.data('api-key-id');
            // make a request
            $.get(`/admin/api_keys/api/${apiKeyId}/delete`, function (data) {
                $(`#api-keys tbody tr[data-api-key-head="${apiKeyId}"]`).remove();
            });
        } else if (actionType === 'create') {
            let input = $('#create-new-api-key input');
            let owner = input.val();
            if (!owner.length) {
                // TODO: notify user about the requirement
                console.log('owner must be set');
                return;
            }

            $.post('/admin/api_keys/api/create', { owner }).done(data => {
                for (let apiKey of data) {
                    $('#api-keys').find('tr:last').prev().after(`
                        <tr id="${apiKey.id}" data-api-key-head="${apiKey.id}">
                            <td class="align-middle">
                            <b class="doc">${apiKey.owner}</b>
                            </td>
                            <td class="text-center align-middle">
                                ${apiKey.key}
                            </td>
                            <td class="text-center align-middle">
                                ${apiKey.permissions}
                            </td>
                            <td class="text-center align-middle">
                                ${apiKey.date_created}
                            </td>
                            <td class="text-center align-middle">
                            <button type="button" class="btn btn-danger btn-sm"
                                data-action="delete"
                                data-api-key-id=${apiKey.id}>
                                delete
                            </button>
                            </td>
                        </tr>
                    `);
                    // bind the new button to the bunction
                    $(`#api-keys tr[data-api-key-head="${apiKey.id}"] button`)
                        .click(bindFuncToApiKeysButton);
                }
                // remove the current input value
                input.val('');
            });

        }
    }

    // bind
    $('#api-keys button').click(bindFuncToApiKeysButton);
});