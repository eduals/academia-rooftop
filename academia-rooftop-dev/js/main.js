jQuery(document).ready(function ($) {
  
  var windowHeight = $(window).height();
  var headerHeight = $('.ac-header-wrap').outerHeight() + 10;
  
  {% if (theme.layout_setting.header.header_top_bar.is_header_top_bar == 'true' || theme.layout_setting.header.header_top_bar.is_header_bottom_bar == 'true') %}
     headerHeight = $('.ac-header').outerHeight() {% if theme.layout_setting.header.header_top_bar.is_header_top_bar == 'true' %}  +  $('.ac-header__top').outerHeight() {% endif %} {% if theme.layout_setting.header.header_bottom_bar.is_header_bottom_bar == 'true'%} + $('.ac-header__bottom').outerHeight() {% endif %} + 10;
  {% endif %}

  $(window).on('scroll',function(){
    var currentScroll = $(this).scrollTop();
    if(!($('body').hasClass('hubspot-disable-focus-styles'))) {
      if(currentScroll > headerHeight) {
          $('.ac-header-wrap').addClass('header-sticky');
          if( currentScroll > windowHeight ) {
            $('.ac-header-wrap').css('margin-top','-' + headerHeight + 'px');
          } else {
            $('.ac-header-wrap').css('margin-top',0);
          }
        windowHeight = currentScroll;

      } else {
        $('.ac-header-wrap').removeClass('header-sticky');
      }
    }
  });

  // Set header height to main content 
  function setHeight() {
    if((!($('body').hasClass('hubspot-disable-focus-styles')))) {
       var headerHeight = $('.ac-header').outerHeight();
        $('#main-content').css('margin-top', headerHeight);
    }
  }

  $(window).on('load', function () {
      setTimeout(function () {
        setHeight();
      }, 100);
  });

  $(window).on('resize', function () {
      setTimeout(function () {
        setHeight();
      }, 150);
  })

 // ---------- Append Language Switcher and Button -------- //
 
  function appendButtonMobile() {
    $('.ac-lang-switcher').appendTo('.ac-header__menu-wrap');
    $('.ac-header--btn').appendTo('.ac-header__menu-wrap');
    setTimeout((function() {
      $(".ac-header--btn").addClass("active");
      $(".ac-lang-switcher").addClass("active");
      }), 100)
    }
  
  function appendButtonDesktop() {
     $('.ac-lang-switcher').appendTo('.ac-header__controls');
     $('.ac-header--btn').appendTo('.ac-header__controls');
  }
  
  $(window).on('load',function() {
    if ($(window).width() < 768) {
      appendButtonMobile();
    }
  })
  
  var timeOutFunctionId;
  var countMobile = 0 , countDesktop = 0;

  $(window).on('resize', function () {
    if ($(window).width() < 768) {
     countDesktop = 0;
     if(countMobile==0) {
      clearTimeout(timeOutFunctionId);
      timeOutFunctionId = setTimeout(appendButtonMobile, 100);
     }
     countMobile+=1;
    } else {
      countMobile = 0;
        if(countDesktop==0) {
            clearTimeout(timeOutFunctionId);
            timeOutFunctionId = setTimeout(appendButtonDesktop, 100);
        }
      countDesktop+=1;
    }
  });


  // Scroll-to-top
  $('.ac-scroll-to-top__btn').click(function () {
    $('html, body').animate({ scrollTop: 0 }, 'slow');
    return false;
  });

  var scrollTop = $('.scrollTop');

  $(window).scroll(function () {
    var topPos = $(this).scrollTop();

    // if user scrolls down - show scroll to top button
    if (topPos > 100) {
      $('.ac-scroll-to-top__btn').css('opacity', '1');

    } else {
      $('.ac-scroll-to-top__btn').css('opacity', '0');
    }

  }); // scroll END

  // end of Scroll-to-top

  $('.ac-blog__action-tag .ac-button').click(function () {
    $(this).siblings('.ac-blog__action-tag-list').toggleClass('active');
  });

})

