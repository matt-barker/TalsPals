

$(document).ready(function(){

  /***General Functions***/
  
  mobileView = function(){
    if ($( window ).width() < 768){
      $("html").addClass("mobile");
    } else {
      $("html").removeClass("mobile");
    }
  };//mobileView()
  
  $(".scroll-button").click(function() {
    var e = $(this).attr("data-scroll-to");
    var n=$(".main-navigation").outerHeight();
    console.log(n);
    $([document.documentElement, document.body]).animate({
        scrollTop: ($(e).offset().top-n),
    }, 1000);
});
    
    
   
  
  /***Scroll Functions***/
  
  $(window).scroll(function(){
    if ($("html").hasClass("mobile")) {
      if($(window).scrollTop() > 74.39)  {
        $('.navigation-items').addClass('stuck');
      } else {
        $('.navigation-items').removeClass('stuck');
    }
  }  else {
    $('.navigation-items').removeClass('stuck');
  }
       $('#home,#services,#about,#reviews,#contact').each(function(i){
          let windowTop = $(window).scrollTop(),
              top = $(this).offset().top,
              height = $(this).outerHeight(),
              bottom = top+height,
              id = '#'+$(this).attr('id'),
              windowCenter = $(window).height()/2;
           
           if (windowTop+windowCenter >= top && windowTop+windowCenter <=bottom) {
               $('[data-scroll-to="'+id+'"]').addClass('active');
           } else {
               $('[data-scroll-to="'+id+'"]').removeClass('active');
           }          
      })
      
      
      
  });//Scroll
  
    
    
   /***Resize Functions***/
  
  $(window).resize(function(){
    mobileView();
  });
  
  mobileView();
  
});
