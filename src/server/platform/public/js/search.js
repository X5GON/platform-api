/**
 * Embeds the oer material into an html element.
 * @param {Object} oer - The OER material.
 * @returns {String} The html element containing the material information.
 */
function prepareMaterial(oer) {
    var element = `<table class="material-content mb-3">
            <body>
            <tr>
                <td class="align-top p-1 pt-2">
                    <span class="fa-stack fa-lg">
                        <i class="fas fa-circle fa-stack-2x"></i>
                        <i class="fas fa-${oer.videoType ? 'video' : oer.audioType ? 'audio' : 'file-alt' }
                            fa-stack-1x fa-inverse"></i>
                    </span>
                </td>
                <td class="w-100 p-1">
                    <a class="material" href="${oer.url}" target="_blank">
                        <strong>${oer.title}</strong>
                        <small><i class="fas fa-external-link-alt"></i></small>
                    </a>
                    <br>
                    <small class="material-link url font-italic">${oer.url}</small>
                    <br>
                    ${oer.description ? '<p class="material-description mb-0">' + oer.description + '</p>' : ''}
                    <div class="row mt-2">
                        <div class="col-6 col-lg-3">
                            <strong class="mr-1">Provider:</strong>${oer.provider}
                        </div>
                        <div class="col-6 col-lg-3">
                            <strong class="mr-1">Language:</strong>${oer.language}
                        </div>
                    </div>
                </td>
            </tr>
            </body>
        </table>`;
    return element;
}


$(document).ready(function () {
    // add on click function
    $('#search').on('click', function (event) {
        // get query parameters
        var query = $('#search-query').val();
        if (query === '') {
            $('#search-results').html(
                `<small>
                    No query text was given. Please enter a keyword or phrase you wish to search for.
                </small>`
            );
            return;
        }

        $('#search-results').html(
            `<div class="text-center mt-5">
                <p>Loading results...</p>
            </div>`
        );


        // get search results
        $.get('/api/v1/search?text=' + encodeURIComponent(query), function (data) {
            if (data.empty) {
                $('#search-results').html(
                    `<small>No materials found for given query='${query}'</small>`
                );
                return;
            }

            // prepare oer materials in a list
            let materials = [];
            for (let oer of data.recommendations) {
                materials.push(prepareMaterial(oer));
            }
            // populate container
            $('#search-results').html(
                `<small>Top ${materials.length} OER material results for '${query}'</small>
                <div class="recommendations mt-3">
                    ${materials.join('')}
                </div>`
            );
        });

    });


    $('#search-query').on('keyup', function (e) {
        if (e.keyCode == 13) { $('#search').click(); }
    });

});