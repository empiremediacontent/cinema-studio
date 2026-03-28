/*
  [JS Index]
  
  ---
  
  Template Name: Wext - One Page Portfolio Template
  Author:  ex-nihilo
  Version: 1.0
*/


/*
  1. preloader
  2. slick slider
    2.1. slick fullscreen slideshow ZOOM/FADE
	2.2. slick testimonials slideshow
  3. fullPage
  4. YouTube player
  5. owl carousel slider
    5.1. owl sections carousel slider
  6. magnificPopup
    6.1. magnificPopup works gallery
	6.2. magnificPopup works gallery slider
  7. swiper slider
    7.1. swiper parallax slider
  8. charts
    8.1. chart about
  9. navigation
    9.1. close navigation
    9.2. navigation active state
*/


$(function() {
    "use strict";
	
	
    $(window).on("load", function() {
        // 1. preloader
        $("#preloader").fadeOut(600);
        $(".preloader-bg").delay(400).fadeOut(600);
    });
	
    // 2. slick slider
    // 2.1. slick fullscreen slideshow ZOOM/FADE
    $(".slick-fullscreen-slideshow-zoom-fade").slick({
        arrows: false,
        initialSlide: 0,
        infinite: true,
        slidesToShow: 1,
        slidesToScroll: 1,
        fade: true,
        autoplay: true,
        autoplaySpeed: 3000,
        cssEase: "cubic-bezier(0.7, 0, 0.3, 1)",
        speed: 1600,
        draggable: true,
        dots: false,
        pauseOnDotsHover: true,
        pauseOnFocus: false,
        pauseOnHover: false
    });
	// 2.2. slick testimonials slideshow
    $(".slick-testimonials").slick({
        arrows: false,
        initialSlide: 0,
        infinite: true,
        slidesToShow: 1,
        slidesToScroll: 1,
        fade: true,
        autoplay: true,
        autoplaySpeed: 4000,
        cssEase: "ease",
        speed: 1600,
        draggable: true,
        dots: false,
        pauseOnDotsHover: false,
        pauseOnFocus: false,
        pauseOnHover: false
    });
	
    // 3. fullPage
    $("#fullpage").fullpage({
        anchors: ["home", "about", "works", "contact"],
        navigation: true,
        navigationPosition: "right",
        navigationTooltips: ["Home", "About", "Works", "Contact"],
        responsiveWidth: 995,
        autoScrolling: true,
        scrollBar: false,
        afterResponsive: function(isResponsive) {}
    });
	
    // 4. YouTube player
    $("#bgndVideo").YTPlayer();
	
    // 5. owl carousel slider
    // 5.1. owl sections carousel slider
    $("#about-section-carousel, #works-section-carousel, #contact-section-carousel").owlCarousel({
        loop: false,
        center: false,
        items: 1,
        margin: 0,
        autoplay: false,
        autoplaySpeed: 1000,
        autoplayTimeout: 5000,
        smartSpeed: 450,
        nav: true,
        navText: ["<i class='owl-custom ion-chevron-left'></i>", "<i class='owl-custom ion-chevron-right'></i>"]
    });
	
	// 6. magnificPopup
    // 6.1. magnificPopup works gallery
    $(".popup-photo").magnificPopup({
        type: "image",
        gallery: {
            enabled: false,
            tPrev: "",
            tNext: "",
            tCounter: "%curr% / %total%"
        },
        removalDelay: 100,
        mainClass: "mfp-fade",
        fixedContentPos: false
    });
	// 6.2. magnificPopup works gallery slider
    $(".popup-photo-gallery").each(function() {
        $(this).magnificPopup({
            delegate: "a",
            type: "image",
            gallery: {
                enabled: true
            },
			removalDelay: 100,
			mainClass: "mfp-fade",
			fixedContentPos: false
        });
    });
	
    // 7. swiper slider
    // 7.1. swiper parallax slider
    var swiper = new Swiper(".parallax .swiper-container", {
        autoplay: 3000,
        speed: 1600,
        parallax: true,
        mousewheelControl: false,
        keyboardControl: true,
        nextButton: ".swiper-button-next",
        prevButton: ".swiper-button-prev",
        paginationClickable: true,
        autoplayDisableOnInteraction: false
    });
	
	// 8. charts
    // 8.1. chart about
    $(".chart-appear-about").appear(function() {
        $(".chart-about").easyPieChart({
            easing: "easeOutBounce",
            onStep: function(from, to, percent) {
                $(this.el).find(".percent-about").text(Math.round(percent));
            }
        });
    });
	
	// 9. navigation
    // 9.1. close navigation
    $(".menu-state").on("click", function() {
        $("#menu-mobile").removeClass("activated");
        $("#menu-mobile-caller").removeClass("lines-close");
    });
    // 9.2. navigation active state
    $("a.menu-state").on("click", function() {
        $("a.menu-state").removeClass("active");
        $(this).addClass("active");
    });
	
	
});