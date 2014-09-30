"use strict";

if (Meteor.isClient) {
  if(Meteor.isCordova) {
    console.log("Yes, I am a cordova app!");
  }


  Meteor.startup(function() {
    console.log('Meteor.startup was called!');

    $('#scroller').on('iscrollpulled', function(ev, d) {
      console.log('making mock asynchronous call');

      window.setTimeout(function() {
        var $sc = $('#scroller');
        $sc
          .children(':eq(1)')
          .children(':eq(0)')
          .before('<p class="bubbledRight">New item added from refresh!</p>');
        $sc.iscroll('refresh');

        d.deferred.resolve(); 
      }, 5500);
    });

    /**
    $('#scroller').on('create', function() {
      console.log('create of iscroll happened');
      // assign bubbled classes
    });

    $('#scroller').on('iscrollstart', function(ev, d){
      console.log('iscrollstart ev', ev, 'd', d);
    });
    **/

    var recalculateHeight = function($this) {
      $('p:odd', $this).not('.bubbledLeft').addClass('bubbledLeft');
      $('p:even', $this).not('.bubbledRight').addClass('bubbledRight');

      var height = 0;
      $this.children().each(function(i, p){
        height += $(p).outerHeight(true);
      });

      $this.css('height', height + 'px');
    };

    $('#scroller').on('iscrollcreated', function(){
      //recalculateHeight($(this));
    });

    $('#scroller').on('iscrollscroll', function(ev, d){
      console.log('scroll -> y: ', d.y, ' height: ', d.scrollerHeight);
    });

    $('#scroller').on('iscrollend', function(ev, d){
      console.log('scrollend -> y: ', d.y, ' height: ', d.scrollerHeight);
    });

    $('#scroller').on('click', function(){
      console.log('click -> ', arguments);
    });

    var count = 3;

    $('#scroller').on('iscrollinfinite', function(ev, d) {
      if(count<0) return;

      window.setTimeout(function() {
          count-=1;
          $('#scroller div:eq(1)')
            .append('<p class="bubbled' + (count % 2 === 0 ? 'Left' : 'Right') + '">This item was created at:<br/> ' + Date().toString() + '</p>');

          d.deferred.resolve(); 
        }, 5500);
    });

  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}