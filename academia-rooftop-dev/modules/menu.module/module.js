jQuery(document).ready(function($) {
  // Website header variables

  var menuParentItems = document.querySelectorAll('.menu--desktop .menu__item--has-submenu');

  if (menuParentItems) {
    Array.prototype.forEach.call(menuParentItems, function(el){
      // Handles hover over

      el.addEventListener('mouseover', function(){
        this.classList.add('menu__item--open');
      });

      // Handles hover out

      el.addEventListener('mouseout', function(){
        document.querySelector('.menu__item--open').classList.remove('menu__item--open');
      });
    });
  }
  // Mobile menu

  // Handles toggle of submenus
  $('.menu--mobile .menu__link.menu__link--toggle').on('click',function(e) {
     e.preventDefault(e);
     $(this).siblings('.menu__submenu').slideToggle();
     $(this).siblings('.menu__child-toggle').toggleClass('menu__child-toggle--open');
     $(this).parent('.menu__item').toggleClass('menu__item--open');
  })
})