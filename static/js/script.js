$(function () {
    $(".panel").on("show.bs.collapse", function (event) {
      var $expand_outer = $(this).find(".expand");
      var $expand = $expand_outer.find(">:nth-child(1) span");
      $expand_outer.closest(".panel-default").addClass("expanded");
      $expand.removeClass("glyphicon-menu-down").addClass("glyphicon-menu-up");
    })
    $(".panel").on("hide.bs.collapse", function (event) {
      var $expand_outer = $(this).find(".expand");
      var $expand = $expand_outer.find(">:nth-child(1) span");
      $expand_outer.closest(".panel-default").removeClass("expanded");
      $expand.removeClass("glyphicon-menu-up").addClass("glyphicon-menu-down");
    })
});
