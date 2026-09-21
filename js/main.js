(function () {
  /***General Functions***/

  var mobileQuery = window.matchMedia("(max-width: 767px)");
  var nav = document.querySelector(".main-navigation");
  var navItems = document.querySelector(".navigation-items");
  var sections = document.querySelectorAll(
    "#home,#services,#about,#reviews,#contact"
  );

  document.querySelectorAll(".scroll-button").forEach(function (button) {
    button.addEventListener("click", function (ev) {
      // nav items are real links so they work without JS; stop the native jump
      ev.preventDefault();
      var target = document.querySelector(
        button.getAttribute("data-scroll-to")
      );
      if (!target) return;
      var top =
        target.getBoundingClientRect().top + window.scrollY - nav.offsetHeight;
      window.scrollTo({ top: top, behavior: "smooth" });
    });
  });

  /***Scroll Functions***/

  var ticking = false;

  function onScroll() {
    ticking = false;
    var windowTop = window.scrollY;

    navItems.classList.toggle(
      "stuck",
      mobileQuery.matches && windowTop > 74.39
    );

    var windowCenter = windowTop + window.innerHeight / 2;
    sections.forEach(function (section) {
      var top = section.getBoundingClientRect().top + windowTop;
      var bottom = top + section.offsetHeight;
      var active = windowCenter >= top && windowCenter <= bottom;
      document
        .querySelectorAll('[data-scroll-to="#' + section.id + '"]')
        .forEach(function (link) {
          link.classList.toggle("active", active);
        });
    });
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(onScroll);
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });

  /***Resize Functions***/

  window.addEventListener("resize", requestUpdate);

  requestUpdate();
})();
