/**
 *  map overlay functions
 */

define([
    'jquery',
    'app/init',
    'app/util'
], function($, Init, Util) {

    'use strict';

    var config = {
        logTimerCount: 3,                                               // map log timer in seconds

        // map
        mapClass: 'pf-map',                                             // class for all maps
        mapWrapperClass: 'pf-map-wrapper',                              // wrapper div (scrollable)

        // map overlays
        mapOverlayClass: 'pf-map-overlay',                              // class for all map overlays
        mapOverlayTimerClass: 'pf-map-overlay-timer',                   // class for map overlay timer e.g. map timer
        mapOverlayInfoClass: 'pf-map-overlay-info',                     // class for map overlay info e.g. map info

        // system
        systemHeadClass: 'pf-system-head'                               // class for system head
    };

    /**
     * Overlay options (all available map options shown in overlay)
     * "active":    (active || hover) indicated whether an icon/option
     *              is marked as "active".
     *              "active": Makes icon active when visible
     *              "hover": Make icon active on hover
     */
    var options = {
        filter: {
            title: 'active filter',
            trigger: 'active',
            class: 'pf-map-overlay-filter',
            iconClass: ['fa', 'fa-fw', 'fa-filter']
        },
        mapSnapToGrid: {
            title: 'active grid',
            trigger: 'active',
            class: 'pf-map-overlay-grid',
            iconClass: ['glyphicon', 'glyphicon-th']
        },
        mapMagnetizer: {
            title: 'active magnetizer',
            trigger: 'active',
            class: 'pf-map-overlay-magnetizer',
            iconClass: ['fa', 'fa-fw', 'fa-magnet']
        },
        systemRegion: {
            title: 'show regions',
            trigger: 'hover',
            class: 'pf-map-overlay-region',
            iconClass: ['fa', 'fa-fw', 'fa-tags'],
            hoverIntent: {
                over: function(e){
                    var mapElement = getMapFromOverlay(this);
                    mapElement.find('.' + config.systemHeadClass).each(function(){
                        var system = $(this);
                        // init tooltip if not already exists
                        if ( !system.data('bs.tooltip') ){
                            system.tooltip({
                                container: mapElement,
                                placement: 'right',
                                title: function(){
                                    return $(this).parent().data('region');
                                },
                                trigger: 'manual'
                            });
                        }
                        system.tooltip('show');
                    });
                },
                out: function(e){
                    var mapElement = getMapFromOverlay(this);
                    mapElement.find('.' + config.systemHeadClass).tooltip('hide');
                }
            }
        }
    };

    /**
     * get mapElement from overlay or any child of that
     * @param mapOverlay
     * @returns {JQuery}
     */
    var getMapFromOverlay = function(mapOverlay){
        return $(mapOverlay).parents('.' + config.mapWrapperClass).find('.' + config.mapClass);
    };

    /**
     * get map overlay element by type e.g. timer/counter, info - overlay
     * @param overlayType
     * @returns {*}
     */
    $.fn.getMapOverlay = function(overlayType){

        var mapWrapperElement = $(this).parents('.' + config.mapWrapperClass);

        var mapOverlay = null;
        switch(overlayType){
            case 'timer':
                mapOverlay = mapWrapperElement.find('.' + config.mapOverlayTimerClass);
                break;
            case 'info':
                mapOverlay = mapWrapperElement.find('.' + config.mapOverlayInfoClass);
                break;
        }

        return mapOverlay;
    };

    /**
     * draws the map update counter to the map overlay timer
     * @param percent
     * @returns {*}
     */
    $.fn.setMapUpdateCounter = function(percent, value){

        var mapOverlayTimer = $(this);

        // check if counter already exists
        var counterChart = mapOverlayTimer.getMapCounter();

        if(counterChart.length === 0){
            // create new counter

            counterChart = $('<div>', {
                class: [Init.classes.pieChart.class, Init.classes.pieChart.pieChartMapCounterClass].join(' ')
            }).attr('data-percent', percent).append(
                $('<span>', {
                    text: value
                })
            );

            mapOverlayTimer.append(counterChart);

            // init counter
            counterChart.initMapUpdateCounter();

            // set tooltip
            mapOverlayTimer.attr('data-placement', 'left');
            mapOverlayTimer.attr('title', 'update counter');
            mapOverlayTimer.tooltip();
        }

        return counterChart;
    };

    /**
     * get the map counter chart by an overlay
     * @returns {*}
     */
    $.fn.getMapCounter = function(){

        var mapOverlayTimer = $(this);

        return mapOverlayTimer.find('.' + Init.classes.pieChart.pieChartMapCounterClass);
    };

    /**
     * start the map update counter or reset
     */
    $.fn.startMapUpdateCounter = function(){

        var mapOverlayTimer = $(this);
        var counterChart = mapOverlayTimer.getMapCounter();

        var maxSeconds = config.logTimerCount;

        var counterChartLabel = counterChart.find('span');

        var percentPerCount = 100 / maxSeconds;

        // update counter
        var updateChart = function(tempSeconds){
            var pieChart = counterChart.data('easyPieChart');

            if(pieChart !== undefined){
                counterChart.data('easyPieChart').update( percentPerCount * tempSeconds);
            }
            counterChartLabel.text(tempSeconds);
        };

        // main timer function is called on any counter update
        var timer = function(){
            // decrease timer
            var currentSeconds = counterChart.data('currentSeconds');
            currentSeconds--;
            counterChart.data('currentSeconds', currentSeconds);


            if(currentSeconds >= 0){
                // update counter
                updateChart(currentSeconds);
            }else{
                // hide counter and reset
                clearInterval(mapUpdateCounter);

                mapOverlayTimer.velocity('transition.whirlOut', {
                    duration: Init.animationSpeed.mapOverlay,
                    complete: function(){
                        counterChart.data('interval', false);
                    }
                });
            }
        };

        // get current seconds (in case the timer is already running)
        var currentSeconds = counterChart.data('currentSeconds');

        // start values for timer and chart
        counterChart.data('currentSeconds', maxSeconds);
        updateChart(maxSeconds);

        if(
            currentSeconds === undefined ||
            currentSeconds < 0
        ){
            // start timer
            var mapUpdateCounter = setInterval(timer, 1000);

            // store counter interval
            counterChart.data('interval', mapUpdateCounter);

            // show overlay
            if(mapOverlayTimer.is(':hidden')){
                mapOverlayTimer.velocity('stop').velocity('transition.whirlIn', { duration: Init.animationSpeed.mapOverlay });
            }
        }
    };

    /**
     * update (show/hide) a overlay icon in the "info"-overlay
     * show/hide the overlay itself is no icons are visible
     * @param option
     * @param viewType
     */
    $.fn.updateOverlayIcon = function(option, viewType){
        var mapOverlayInfo = $(this);

        var showOverlay = false;

        var mapOverlayIconClass = options[option].class;

        // look for the overlay icon that should be updated
        var iconElement = mapOverlayInfo.find('.' + mapOverlayIconClass);

        if(iconElement){
            if(viewType === 'show'){
                showOverlay = true;

                // check "trigger" and mark as "active"
                if(options[option].trigger === 'active'){
                    iconElement.addClass('active');
                }

                // display animation for icon
                iconElement.velocity({
                    opacity: [0.8, 0],
                    scale: [1, 0],
                    width: ['26px', 0],
                    marginLeft: ['3px', 0]
                },{
                    duration: 240,
                    easing: 'easeInOutQuad'
                });
            }else if(viewType === 'hide'){
                iconElement.removeClass('active').velocity('reverse');

                // check if there is any visible icon remaining
                var visibleIcons = mapOverlayInfo.find('i:visible');
                if(visibleIcons.length > 0){
                    showOverlay = true;
                }
            }
        }

        // show the entire overlay if there is at least one active icon
        if(
            showOverlay === true &&
            mapOverlayInfo.is(':hidden')
        ){
            // show overlay
            mapOverlayInfo.velocity('stop').velocity('transition.whirlIn', { duration: Init.animationSpeed.mapOverlay });
        }else if(
            showOverlay === false &&
            mapOverlayInfo.is(':visible')
        ){
            // hide overlay
            mapOverlayInfo.velocity('stop').velocity('transition.whirlOut', { duration: Init.animationSpeed.mapOverlay });
        }
    };

    /**
     * init all map overlays on a "parent" element
     * @returns {any|JQuery|*}
     */
    $.fn.initMapOverlays = function(){
        return this.each(function(){
            var parentElement = $(this);

            var mapOverlayTimer = $('<div>', {
                class: [config.mapOverlayClass, config.mapOverlayTimerClass].join(' ')
            });
            parentElement.append(mapOverlayTimer);

            // ---------------------------------------------------------------------------
            // add map overlay info. after scrollbar is initialized
            var mapOverlayInfo = $('<div>', {
                class: [config.mapOverlayClass, config.mapOverlayInfoClass].join(' ')
            });

            // add all overlay elements
            for (var prop in options) {
                if(options.hasOwnProperty(prop)){
                    var icon = $('<i>', {
                        class: options[prop].iconClass.concat( ['pull-right', options[prop].class] ).join(' ')
                    }).attr('title', options[prop].title).tooltip({
                        placement: 'left',
                        container: 'body',
                        delay: 150
                    });

                    // add "hover" action for some icons
                    if(options[prop].trigger === 'hover'){
                        icon.hoverIntent(options[prop].hoverIntent);
                    }

                    mapOverlayInfo.append(icon);
                }
            }
            parentElement.append(mapOverlayInfo);

            // reset map update timer
            mapOverlayTimer.setMapUpdateCounter(100, config.logTimerCount);
        });
    };

});