"use strict";

/**
window.console = {
    log: function() {
        $('#listview li:last')
            .after("<li>" + 
                $.makeArray($.each(arguments, function() { 
                    if(typeof(this)==="string") 
                        return this; 
                    else
                        return JSON.stringify(this);
                })).join('&nbsp;') + "</li>");

        if($('#listview').data('mobileListview')!==undefined) {
            window.setTimeout(function() {
                $('#listview').listview('refresh');
                $('#scroller').iscroll('refresh');    
            }, 1500);
        }
    }
};
**/

/**
function flattenObject(obj, prefix, spacer) {
    var spacer = (spacer==null?'':spacer);
    var prefix = (prefix==null?'':prefix);

    return Array.prototype.concat.apply([], 
        $.map(obj, function(v, k){
            if($.isPlainObject(v)) {
                return [flattenObject(v, prefix + spacer + k, spacer)];
            }
            return prefix + spacer + k;
        })
    );
};
**/

/**
    key: "data-foo"
    value: "true" (a string value to be json parsed)
    obj: {foo: 1}
    prefix: "data"
    spacer: "-"

    e.g this function sets the value true on the foo key
**/
function setValueOnKeyUsingPath(key, value, obj, prefix, spacer) {
    var origObj = obj;
    var lastSegment = null;

    var items = key.split(spacer);
    items.shift(); // remove the first items since it is the [prefix] item we don't want or need

    for(var i in items) {
        var segment = items[i];
        // the last item in the key-chain is the target property
        if(i < items.length-1) {
            if($.isPlainObject(obj[segment])) {
                obj = obj[segment];
            } else if (obj[segment] == undefined) {
                var a = {};
                obj[segment] = a;
                obj = a;
            }
        }
        lastSegment = segment;
    }

    var jsonV = null;

    switch($.type(obj[lastSegment])) {
        case 'string':
            jsonV = value;
            break;
        default:
            jsonV = JSON.parse(value);
            break;
    }

    obj[lastSegment] = jsonV;

    return origObj;
};

/**
// debouncing function from John Hann
// http://unscriptable.com/index.php/2009/03/20/debouncing-javascript-methods/
var debounce = function (func, threshold, execAsap) {
    var timeout;

    return function debounced () {
      var obj = this, args = arguments;
      function delayed () {
          if (!execAsap)
              func.apply(obj, args);
          timeout = null;
      };

      if (timeout)
          clearTimeout(timeout);
      else if (execAsap)
          func.apply(obj, args);

      timeout = setTimeout(delayed, threshold || 100);
    };
};
**/

var preventDefault = function(e) { e.preventDefault(); };

// TODO: Refactor state management into an FSM using Machina.JS

/** iScroll Widget **/
$.widget('mobile.iscroll', {
    options: {
        /** TODO: Need to know why this needs to be false! **/
        preventDefault: false,
        
        /** Enabled to support testing in full browser. **/
        mouseWheel: true,
        scrollbars: true,

        // Required to trigger the 'scroll' event see http://iscrolljs.com/#custom-events for details
        probeType: 1,

        // Options configured below here are specific to this widget and SHOULD NEVER BE ALLOWED to conflict with iscroll options
        pulltorefresh: {
            enabled: false, 
            pulllabel: 'Pull to refresh...', 
            releaselabel: 'Release to refresh...', 
            loadinglabel: 'Loading...', 
            pulledeventtimeout: 60000, /** Default timeout of 1 minute **/
            timeoutHandle: -1,
            sensitivity: 20 /** How many pixels have to be pulled down before the release to refresh is triggered. **/
        },
        fullscreen: false,
        infinite: true,
        infiniteSensitivity: 250, /** When a scrollEnd event occurs, if the bottom of the scroller is <= 75 then we trigger an "infinite" event **/
        infiniteTimeout: 60000 /** Default timeout of 1 minute **/
    },

    /** This maintains a reference to the IScroll implementation object. **/
    scroll: null,

    _resettingScrollPosition: false,
    
    _configurePullToRefresh: function() {
        var $el = $(this.element);

        // Create markup for pulldown  
        var html = '<div class="iscroll-pullDown"><span class="iscroll-pullDownIcon">&nbsp;</span><span class="iscroll-pullDownLabel"></span></div>';
        if($el.find('.iscroll-pullDown').length === 0) {
            if($el.children().length > 0) {
                $el.children().first().before(html);
            } else {
                $el.append(html);
            }

            $el.find('.iscroll-pullDownLabel').text(this.options.pulltorefresh.pulllabel);
        }

        this.options.pulltorefresh.pullDownHeight = $('.iscroll-pullDown', this.element).height();

        this.options.startY = parseInt(this.options.pulltorefresh.pullDownHeight) * -1;

        /**
        Strictly speaking this option is NOT a requirement of the pull to refresh implementation as there are no tap handlers registered!

        //Set this to true to let iScroll emit a custom tap event when the scroll area is clicked/tapped but not scrolled.
        //This is the suggested way to handle user interaction with clickable elements.
        **/
        this.options.tap = true;

        this.options.preventDefaultException = {tagName:/.*/};
        
        //this.options.keyBindings = false;
    },

    _attachHandlersPullToRefresh: function() {
        var wThis = this;

        var $pullDownEl = $('.iscroll-pullDown', this.element);

        this.scroll.on('scroll', function() {
            //console.log('scroll -> y: ', this.y, ' sensitivity: ', wThis.options.pulltorefresh.sensitivity, ' y:', this.distY);
            
            if(wThis._resettingScrollPosition) {
                return;
            }

            // if there is NOT already a pulldown event in process
            // if the pulldown distance is greater than the sensitivity setting in pixels
            // if the location of the pulldown is at the top - indicating a true pull down
            // if the pullDownEl is not already in the proper state
            // THEN we switch state
            if(
                wThis.options.pulltorefresh.timeoutHandle < 0 
                && this.y >= wThis.options.pulltorefresh.sensitivity
                && !$pullDownEl.hasClass('flip')) {
                    $pullDownEl
                        .addClass('flip')
                        .find('.iscroll-pullDownLabel')
                            .text(wThis.options.pulltorefresh.releaselabel);
            }
        });

        this.scroll.on('scrollEnd', function() {
            if(wThis._resettingScrollPosition) {
                wThis._resettingScrollPosition = false;
                return;
            }

            if(wThis.options.pulltorefresh.timeoutHandle < 0) {
                // and we are ready to trigger a refresh
                if($pullDownEl && $pullDownEl.hasClass('flip') && wThis.options.pulltorefresh.timeoutHandle < 0) {
                    // remove the intermediate up arrow display and replace it with a loading display
                    $pullDownEl
                        .removeClass('flip')
                        .addClass('loading')
                        .find('.iscroll-pullDownLabel')
                            .text(this.options.pulltorefresh.loadinglabel)

                    // Reset the top of the scroller
                    $('.scroller', wThis.element).css({top:0});

                    var d = $.Deferred();
                    d.always(function() {
                        window.clearTimeout(wThis.options.pulltorefresh.timeoutHandle);
                        wThis.options.pulltorefresh.timeoutHandle = -1;

                        $pullDownEl
                            .removeClass('loading')
                            .find('.iscroll-pullDownLabel')
                                .text(wThis.options.pulltorefresh.pulllabel);

                        // Just check to see if the current scroll position is near the top, if so, reset the scroll position to the correct top
                        if(wThis.scroll.y > wThis.options.pulltorefresh.pullDownHeight*-1) {
                            wThis._resetScrollPosition();
                        }
                    });

                    wThis.options.pulltorefresh.timeoutHandle = wThis._delay(function() { d.resolve(this); }, wThis.options.pulltorefresh.pulledeventtimeout);
                    wThis._trigger('pulled', null, {deferred: d});
                } else if (this.y > (wThis.options.pulltorefresh.pullDownHeight *-1)) {
                    wThis._resetScrollPosition(250);
                }
            }
        });
    },

    _resetScrollPosition: function(delay) {
        if(!this._resettingScrollPosition) {
            this._resettingScrollPosition = true;
            var xPos = this.options.pulltorefresh.pullDownHeight * -1;
            if(this.scroll.y != xPos) {
                this.scroll.scrollTo(0, xPos, delay == undefined || delay == null ? 250 : delay);
            }
        }
    },

    _attachHandlersInfiniteLoading: function() {
        var wThis = this;

        this.scroll.on('scrollEnd', function() {
            if(this.y < 0 && this.scrollerHeight - (this.y * -1 + this.wrapperHeight) < this.options.infiniteSensitivity) {

                var d = $.Deferred();
                d.always(function() {
                    window.clearTimeout(wThis.options.infiniteHandle);
                    wThis.options.infiniteHandle = -1;

                    wThis.refresh();
                });

                wThis.options.infiniteHandle = wThis._delay(function() { d.resolve(this); }, wThis.options.infiniteTimeout);

                wThis._trigger('infinite', null, {deferred: d});
            }
        });
    },

    _setupMethodPassthrough: function() {
        var wThis = this;

        $.each(['scrollTo','scrollBy','scrollToElement'], function() {
            var methodName = this;
            wThis[methodName] = function() {
                if(this.scroll) {
                    this.scroll[methodName].apply(this.scroll, arguments);
                }
            }
        });
    },

    _create: function() {
        this._setupMethodPassthrough();

        var wThis = this;

        var $el = $(this.element);

        // get a list of attribute values that were set on the element as a way to configure the widget's options
        // flattenObject(this.options, 'data', '-')

        // TODO: Solve a problem with the case of the attr.localName being in lowercase and the options being set that are mixed case!
        $.each(
            $.map($el[0].attributes, function(attr) {
                if(/^data-/.test(attr.localName)) 
                    return attr.localName.toLowerCase();
            }), function(i, propName) {
                setValueOnKeyUsingPath(propName, $el.attr(propName), wThis.options, 'data', '-');
            }
        );

        $(document)
            /** If this isn't the first iScroll initialized in the app we should unhook the existing handler just so we don't create duplicates! **/
            .off('touchmove', preventDefault) 
            /** Turn off the default handling of the touchmove event so that iScroll can take care of it! **/
            .on('touchmove', preventDefault);

        // don't scroll the whole page, just the content intended to be scrolled!
        $('body').css('overflow', 'hidden');

        // Step 1) Configure for handling specific options
        if(this.options.pulltorefresh.enabled) {
            this._configurePullToRefresh();
        }

        // Step 2) Create the instance

        // attach the scroller class to the widget element
        var $sc = $(this.element)
            .addClass('iscroll-scroller');

        // add a wrapper element as a parent of the widget and assign the wrapper css class
        var $wr = $sc
            .wrap(
                $('<div class="iscroll-wrapper"></div>')
            )
            .parents('.iscroll-wrapper')
            .css({
                position: 'relative',
                overflow: 'hidden'
            });

        if(this.options.fullscreen) {
            var headerHeight = $('[data-role=header][data-position=fixed]').outerHeight(true);
            var footerHeight = $('[data-role=footer][data-position=fixed]').outerHeight(true);

            console.log('fullscreen -> h: ', headerHeight, ' f: ', footerHeight);

            $wr
                .css({
                    // setting bottom and top means that the height is managed by the browser
                    bottom: footerHeight,
                    top: headerHeight,
                    right: '0px',
                    position: 'absolute'
                })
                .parents('.ui-content')
                    // Reset default ui-content padding applied by JQM
                    .css({padding: '0px'});

            // apply the 1em of padding that is reset on the ui-content element to all children of the scroller
            $sc.children()
                .not('.iscroll-pullDown')
                .css('padding', '1em');

            if(this.options.pulltorefresh.enabled) {
                $wr
                    .find('.iscroll-pullDown')
                    .css({'margin-bottom': '0px', 'padding-bottom': '0px'});
            }
        }

        console.log('creating iscroll instance with options: ', this.options);

        this.scroll = new IScroll($wr[0], this.options);

        // Step 4) Attach handlers
        if(this.options.pulltorefresh.enabled) {
            this._attachHandlersPullToRefresh();
        }

        if(this.options.infinite) {
            this._attachHandlersInfiniteLoading();
        }

        // the "this" context for the handlers is the iScroll instance
        this.scroll.on('beforeScrollStart', function(){ wThis._trigger('beforestart', null, this);  });
        this.scroll.on('scrollCancel',      function(){ wThis._trigger('cancel', null, this)        });
        this.scroll.on('scrollStart',       function(){ wThis._trigger('start', null, this);        });
        this.scroll.on('scroll',            function(){ wThis._trigger('scroll', null, this);       });
        this.scroll.on('scrollEnd',         function(){ wThis._trigger('end', null, this);          });
        this.scroll.on('flick',             function(){ wThis._trigger('flick', null, this);        });

        // Step 5) In order to prevent seeing the "pull down to refresh" before the iScoll is trigger - 
        // the wrapper is located at left:-9999px and returned to left:0 after the iScoll is initiated
        this._delay(function() { 
            $wr.css({left:0});

            if(this.options.pulltorefresh.enabled) {
                // If the wrapper's height is greater than the scrollers height, make the height 
                // at least the current height plus the pulldoown height so that the pull down 
                // works properly.
                if($wr.outerHeight(true) > $sc.outerHeight(true)) {
                    $sc.css('height', 
                        $wr.outerHeight(true) + this.options.pulltorefresh.pullDownHeight + 'px');
                }

                this.refresh().done(function () {
                    wThis._resetScrollPosition();
                });
            }

            wThis._trigger('created');
        }, 300);
    },
    
    _destroy: function() {
        var $el = $(this.element);

        $el.removeAttr('data-iscroll');

        // if this is the last iscroll on the currently active page remove the body overflow:hidden css setting
        if($(':mobile-pagecontainer').pagecontainer('getActivePage').find('[data-iscroll]').not($el).length == 0)
            $('body').css('overflow', 'visible');

        // Unwrap the iscroll-wrapper element from the stack, remove the added iscroll-scroller class
        $el.unwrap().removeClass('iscroll-scroller');

        if(this.options.fullscreen) {
            // remove the ui-content class padding reset
            $el.parents('.ui-content').css({padding: ''});
        }

        if(this.options.pulltorefresh.enabled) {
            $el.find('.iscroll-pullDown').remove();
        }

        $(document)
            /** If this isn't the first iScroll initialized in the app we should unhook the existing handler just so we don't create duplicates! **/
            .off('touchmove', preventDefault);

        if(this.scroll !== null)
            this.scroll.destroy();
    },

    _refresh: function(d) {
        this.scroll.refresh();
        d.resolve();
    },

    // See http://iscrolljs.com/#refresh for the full details on the refresh of the iscrollpull
    refresh: function() {
        var d = $.Deferred();
        if(this.scroll) {
            this._delay(function(){this._refresh(d);}, 200);
        }
        return d;
    }
});

// NOTE: pageshow event timing is NOT optional!  If the pageshow event is NOT used the header and footer height are NOT returned appropriately!
$(document).on('pageshow', function() {
    $('[data-iscroll=true]').iscroll();
});