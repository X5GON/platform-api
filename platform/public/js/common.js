$(document).ready(function () {
   // activate tooltips
   $('[data-toggle="tooltip"]').tooltip();
   // add function to all clickable rows
   $(".clickable-row").click(function() {
      window.location = $(this).data("href");
  });
});