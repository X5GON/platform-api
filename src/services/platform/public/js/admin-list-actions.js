// initalize listeners on document ready
$(document).ready(function () {

    function bindFuncToAdminButton(e) {
        let button = $(this);
        let actionType = button.data('action');

        if (actionType === 'delete') {
            let adminId = button.data('admin-id');
            // make a request
            $.get(`/admin/list/api/${adminId}/delete`, function (data) {
                $(`#admins tbody tr[data-admin-head="${adminId}"]`).remove();
            });
        } else if (actionType === 'create') {
            let usernameInput = $('#create-new-admin input[type="username"]');
            let passwordInput = $('#create-new-admin input[type="password"]');

            let username = usernameInput.val();
            let password = passwordInput.val();
            if (!username.length || !password.length) {
                // notify user about the requirement
                return alert('Username and password must be set!');
            }

            $.post('/admin/list/api/create', { username, password }).done(data => {

                for (let admin of data) {
                    $('#admins').find('tr:last').prev().after(`
                        <tr id="${admin.id}" data-admin-head="${admin.id}">
                            <td class="align-middle">
                            <b class="doc">${admin.username}</b>
                            </td>
                            <td class="align-middle">
                            ${admin.password_hidden}
                            </td>
                            <td class="text-center align-middle">
                            <button type="button" class="btn btn-danger btn-sm"
                                data-action="delete"
                                data-admin-id=${admin.id}>
                                delete
                            </button>
                            </td>
                        </tr>
                    `);
                    // bind the new button to the bunction
                    $(`#admins tr[data-admin-head="${admin.id}"] button`)
                        .click(bindFuncToAdminButton);
                }
                // remove the current input value
                usernameInput.val('');
                passwordInput.val('');
            });

        }
    }

    // bind
    $('#admins button').click(bindFuncToAdminButton);
});