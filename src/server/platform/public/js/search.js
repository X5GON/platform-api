function empty() {
    // get query parameters
    var query = $('#search-query').val();
    if (query === '') { return false; }
}

$(document).ready(function () {
    // add on click function
    $('#search-query').on('keyup', function (e) {
        if (e.keyCode === 13) { $('#search').click(); }
    });

    $('.inspect').click(function () {
        // set source link of the material
        const embed = $(this).data('embed');
        $('#material-inspect').attr('src', embed);

        // set height of the material inspect
        const height = $(this).data('type') === 'video' ? 605 :
            $('#search-results .recommendations').height() - 40;
        $('#material-inspect').height(height);

        // set the title of the material
        const title = $(this).data('title');
        $('.material-inspect-container .material-title').html(title);
        $('.material-inspect-container .material-title').removeClass('invisible');
    });

    $(window).resize(function () {
        if ($(this).width() < 1346) {
            $('.material-inspect-container .material-title').html(null);
            $('#material-inspect').attr('src', null);
        }
    });

});