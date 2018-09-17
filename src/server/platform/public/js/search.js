function empty() {
    // get query parameters
    var query = $('#search-query').val();
    if (query === '') { return false; }
};

$(document).ready(function () {
    // add on click function
    $('#search-query').on('keyup', function (e) {
        if (e.keyCode == 13) { $('#search').click(); }
    });

});