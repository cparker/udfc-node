    var earthMode = false;
    var map;
    var ge;
    var directionsService = new google.maps.DirectionsService();
    var directionsDisplay;
    var topoLayer;
    var link;
    var networkLink;
    var searchService;

    var coCenter = new google.maps.LatLng(39.361194, -105.763006);

    var loadMap = function() {
      //var chicago = new google.maps.LatLng(41.875696,-87.624207);
      var mapOptions = {
        zoom: 8,
        // center : chicago,
        center: coCenter,
        mapTypeId: google.maps.MapTypeId.TERRAIN
      };

      map = new google.maps.Map(document.getElementById("map"), mapOptions);
      var layer = new google.maps.KmlLayer('http://gmaps-samples.googlecode.com/svn/trunk/ggeoxml/cta.kml',
        {
          preserveViewport : true,
          map : map
        }
      );

      google.maps.event.addListener(layer, 'status_changed', function () {
        if (layer.getStatus() != 'OK') {
            $('#maps-error').text('[' + layer.getStatus() + '] Google Maps could not load the layer. Please try again later.');
            $('#maps-error').dialog('open');
        } else {
            topoLayer = layer;
            topoLayer.setMap(map);
        }
      });

      directionsDisplay = new google.maps.DirectionsRenderer();
      directionsDisplay.setMap(map);
      directionsDisplay.setPanel(document.getElementById("directions"));

      searchService = new google.maps.places.PlacesService(map);

      return false;
    };


    var foundWreckMarks = Array();
    var allMilMarks = Array();
    var completeMarks = Array();


    var attachClicker = function(marker,wreck) {

      var content;

      var wreckURL;

      var mapPopupTemplate =
        "<div id='popup-template' class='mapPopup'>" +
          "<h5>%(name)s</h5>" +
          "<h5>Lat: %(titleLat)s Lng: %(titleLng)s</h5>" +
          "<i class='icon-list-alt'></i>&nbsp;<a class='%(detailLinkClass)s' id='detailsLink' href='%(detailLink)s' target='_blank'>Wreck Details</a><br/>" +
          "<i class='icon-road'></i>&nbsp;<a onClick='%(dirClick)s' id='directionsLink' href='#'>Driving Directions</a><br/>" +
          "<i class='icon-globe'></i>&nbsp;<a id='earthLink' href='#'>Open In Google Earth</a><br/>" +
          "<i class='icon-flag'></i>&nbsp;<a id='trailLink' href='%(trailLink)s' target='_blank'>Search trails.com</a><br/>" +
          "<i class='icon-flag'></i>&nbsp;<a id='trimbleLink' href='%(trimbleLink)s' target='_blank'>Search trimble.com</a><br/>" +
          "<i class='icon-th'></i>&nbsp;<a id='usgsLink' href='%(usgsLink)s' target='_blank'>Download USGS Maps</a><br/>" +
          "<i class='icon-camera'></i>&nbsp;<a id='flickrClick' onClick='%(flickrClick)s' href='#'>Show nearby Flickr photos</a><img id='loader' class='loader' src='loader.gif'/><br/>" +
        "</div>"

      if (wreck.name && wreck.url) {
        content = 
          wreck.hint + "<br/>" +
          "<a href='" + wreck.url + "'>" + wreck.name + "</a>"
      } else {
        content = wreck.hint;
      }

      content = content + 
        "<br/><a href='#' OnClick='popDirections(" + "\""+wreck.hint+"\"" + " );' title='directions'>directions</a>"

      content = content + "<br/>" +
        "<a href='#' OnClick='popEarth(" + "\""+wreck.hint+"\"" + " );' title='view in GE'>View in GE</a>"

      var popDirClick = sprintf('popDirections("%1$s");',wreck.hint);

      var trailLink = sprintf(
        'http://www.trails.com/trailfinder/browsebymap/?statecode=CO' +
        '&lat=%(lat)s&lon=%(lon)s&z=13&m=terrain&a=', { lat : wreck.locLat, lon : wreck.locLong });

      var trimbleLink = sprintf(
        'http://www.trimbleoutdoors.com/Search/#%(lat)s,  %(lon)s',
        { lat : wreck.locLat, lon : wreck.locLong }
      );


      var usgsLink = 'http://store.usgs.gov/b2c_usgs/usgs/maplocator/(ctype=areaDetails&xcm=r3standardpitrex_prd&carea=%24ROOT&layout=6_1_61_48&uiarea=2)/.do';

      var usgsDeepLink = 
        'http://usgs01.srv.mst.edu/store3//digital_download/mapping_ap.jsp?searchFormHidden=searchFormHidden&page=%2Fdigital_download%2Fmapping_ap.jsp&' +
        sprintf('localLng=%(lon)s&localLat=%(lat)s&searchField=',{ lat : wreck.locLat, lon : wreck.locLong }) +
        wreck.locLat + 
        '%2C' + wreck.locLong +
        '&searchSourceComboBox=address&goButton=Go';

      var templateVars = {
        name : wreck.hint,
        detailLinkClass : wreck.url ? '' : 'disabledlink',
        detailLink : wreck.url,
        dirClick : popDirClick,
        trailLink : trailLink,
        trimbleLink : trimbleLink,
        usgsLink : usgsLink,
        flickrClick : sprintf('flickrSearch(%1$s, %2$s);', wreck.locLat, wreck.locLong),
        titleLat : wreck.locLat,
        titleLng : wreck.locLong
      };

      var html = sprintf(mapPopupTemplate, templateVars);

      var infoWindow = new google.maps.InfoWindow({
        content : html
      });

      google.maps.event.addListener(marker, 'click', function() {
        infoWindow.open(map, marker);
      });
      
    };

    var flickrInfoWindow = new google.maps.InfoWindow();

    var picMarkers = new Array();

    var flickrSearch = function(lat,lng,bbox) {
      $('#loader').css("visibility","visible");
      _.each(picMarkers, function(m) { m.setMap(null); });
      var bounds = map.getBounds();

      var locData = {
        minLong : bounds.getSouthWest().lng(),
        minLat : bounds.getSouthWest().lat(),
        maxLong : bounds.getNorthEast().lng(),
        maxLat : bounds.getNorthEast().lat(),
        centerLat : lat,
        centerLon : lng
      };

      var searchUrl;
      if (bbox == true) {
        $('#flickrFullScreen').button('loading');
        // by bbox
        searchUrl = sprintf('http://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=b3e3c1ee9c93df1d2b5273b05531e15b&format=json&bbox=%(minLong)s,%(minLat)s,%(maxLong)s,%(maxLat)s&min_upload_date=2001-01&jsoncallback=?&extras=geo,description',locData);
      } else {
        // by point / radius
         searchUrl = sprintf('http://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=b3e3c1ee9c93df1d2b5273b05531e15b&format=json&lat=%(centerLat)s&lon=%(centerLon)s&radius=20&accuracy=11&min_upload_date=2001-01&jsoncallback=?&extras=geo,description&per_page=500',locData);
       }

      $.getJSON(searchUrl, function(data) {
        console.log("hits " + data.photos.total);
        if (bbox == true) {
          $('#flickrFullScreen').button('reset');
        } else {
          $('#loader').css("visibility", "hidden");
        }
        _.each(data.photos.photo, function(pic) {
          // make a marker
        var marker = new google.maps.Marker({
          icon : white,
          map: map,
          position: new google.maps.LatLng(pic.latitude,pic.longitude)
        });

        picMarkers.push(marker);
        
        var templateVars = {
          imgSmall : sprintf('http://farm%(farm)s.static.flickr.com/%(server)s/%(id)s_%(secret)s.jpg', pic),
          description : pic.description,
          pageUrl : sprintf('http://www.flickr.com/photos/%(owner)s/%(id)s', pic)
        };

        var desc = pic.description._content + '<br/>';

        var html = 
          sprintf(
            '<img src="%(imgSmall)s"/><br/>' +
            desc +
            '<a target="_blank" href="%(pageUrl)s">View on flickr</a>',
          templateVars);

        google.maps.event.addListener(marker, 'click', function() {
          flickrInfoWindow.setContent(html);
          flickrInfoWindow.open(map,marker);
        });

        });
      });

      return false;
    };

    var usgsClick = function(lat,lon) {
          alert('usgs click ' + lat + ' ' + lon);
          $.ajax({
            type: "GET",
            url: "http://store.usgs.gov/b2c_usgs/b2c/start/(xcm=r3standardpitrex_prd)/.do"
          }).done(function( msg ) {
            console.log( "request finished " + msg );
          });
        return false;
    };


    var popDirections = function(wreckHint) {
      dirFunc(wreckHint.substr(0,4))();
    };

    var popEarth = function(wreckHint) {
      console.log('WH ' + wreckHint);
      viewEarthFunc(wreckHint.substr(0,4))();
    };



    var addCompleteWrecks = function() {
      _.each(completeWrecks,function(w) {
        
        var marker = new google.maps.Marker({
          position: new google.maps.LatLng(w.locLat,w.locLong),
          map: map,
          icon: w.ico,
          title : w.hint
        });

        attachClicker(marker,w);

        completeMarks.push(marker);
      });
      return false;
    };


    var addWrecks = function() {

      _.each(wrecks, function(wreck) {

        var marker = new google.maps.Marker({
          position: new google.maps.LatLng(wreck.locLat,wreck.locLong),
          map: map,
          icon: wreck.ico,
          title : wreck.hint
        });

        attachClicker(marker,wreck);

        allMilMarks.push(marker);

      });
    };


    var addFoundWrecks = function() {
      _.each(foundWrecks, function(foundWreck) {

        var marker = new google.maps.Marker({
          position: new google.maps.LatLng(foundWreck.locLat,foundWreck.locLong),
          map: map,
          icon: foundWreck.ico,
          title : foundWreck.hint
        });

        attachClicker(marker, foundWreck);

        foundWreckMarks.push(marker);

      });
    };


    var shower = function(itemId, markList) {
      return function() {
        //$(itemId).toggleClass("selected");
        _.each(markList, function(foundWreck) {
          foundWreck.setVisible(true);
        });
        $(itemId).button('toggle');
        var newTitle = $(itemId).html().replace('Show','Hide');
        $(itemId).html(newTitle);
      };
    };

    var hider = function(itemId, markList) {
      return function() {
        //$(itemId).toggleClass("selected");
        _.each(markList, function(foundWreck) {
          foundWreck.setVisible(false);
        });
        $(itemId).button('toggle');
        var newTitle = $(itemId).html().replace('Hide','Show');
        console.log("hider new title " + newTitle);
        $(itemId).html(newTitle);
      };
    };

    var displayFoundWrecks = function() {
      $("#viewFound").toggleClass("btn.active");
      //$('#viewFound').button('toggle');
      _.each(foundWreckMarks, function(foundWreck) {
        foundWreck.setVisible(true);
      });
    };

    var hideFoundWrecks = function() {
      $("#viewFound").toggleClass("selected");
      _.each(foundWreckMarks, function(foundWreck) {
        foundWreck.setVisible(false);
      });
    };


    var hideMilWrecks = function() {
      $("#allMil").toggleClass("selected");
      _.each(allMilMarks, function(milWreck) {
        milWreck.setVisible(false);
      });
      
    };

    var showMilWrecks = function() {
      $("#allMil").toggleClass("selected");
      _.each(allMilMarks, function(milWreck) {
        milWreck.setVisible(true);
      });
    };

    var smoothZoomIn = function() {
      var zoomTimer = 600;

      var zoom1 = function() {
        map.setZoom(9);
        setTimeout(zoom2,zoomTimer);
      };

      var zoom2 = function() {
        map.setZoom(10);
        setTimeout(zoom3,zoomTimer);
      };

      var zoom3 = function() {
        map.setZoom(11);
        setTimeout(zoom4,zoomTimer);
      };

      var zoom4 = function() {
        map.setZoom(12);
      };
      setTimeout(zoom1,zoomTimer);
    };


    var dirStart = new google.maps.LatLng(39.915444, -105.092930);


    var zoomFunc = function(markId) {
      var allMarks = foundWreckMarks.concat(allMilMarks, completeMarks);
      console.log('markId ' + markId);
      return function() {
        console.log('zooming');
        var mark = _.find(allMarks, function(m) {
          return m.title.indexOf(markId) != -1;
        });
        map.panTo(mark.getPosition());
        smoothZoomIn();
        google.maps.event.trigger(mark,'click');
        return false;
      };
    };


    var dirFunc = function(markId) {
      return function() {
        var allMarks = foundWreckMarks.concat(allMilMarks, completeMarks);

        var mark = _.find(allMarks, function(foundWreckMark) {
          return foundWreckMark.title.substr(0,4) == markId;
        });
        var request = {
          origin : dirStart,
          destination:mark.getPosition(),
          travelMode: google.maps.TravelMode.DRIVING
        };

        directionsService.route(request, function(result, status) {
            if (status == google.maps.DirectionsStatus.OK) {
              directionsDisplay.setDirections(result);
            }
        });
      };
    };


    var switchToEarth = function() {
        if (earthMode == false) {

          var handler = function(instance) {
            ge = instance;
            ge.getLayerRoot().enableLayerById(ge.LAYER_BORDERS, true);
            ge.getLayerRoot().enableLayerById(ge.LAYER_ROADS, true);
            ge.getWindow().setVisibility(true);
            console.log("ge is " + ge);
            return false;
          };

          google.earth.createInstance('map', handler);
          //console.log("2 ge isa " + ge);

          earthMode = true;
        }
        return false;
    };

    var switchToMaps = function() {
      if (earthMode == true) {
        loadMap();
        addWrecks();
        addFoundWrecks();
        addCompleteWrecks();
        earthMode = false;
      }
      return false;
    };


    var globalMarkId;

    var findMarkByName = function(name) {
      var allMarks = foundWreckMarks.concat(allMilMarks, completeMarks);
      return _.find(allMarks, function(m) {
        return m.title.substr(0,4) == name.substr(0,4);
      });
    };

    var viewEarthFunc = function(markId) {

      return function() {
        console.log("view earth func ");

        var markFunc = function() {
          var localMarkId;
          if (markId) {
            localMarkId = markId;
          } else {
            localMarkId = globalMarkId;
          }

          var allMarks = foundWreckMarks.concat(allMilMarks, completeMarks);

          console.log("running mark func " + localMarkId);
          var mark = _.find(allMarks, function(foundWreckMark) {
            return foundWreckMark.title.substr(0,4) == localMarkId;
          });

          var lat = mark.getPosition().lat();
          var lng = mark.getPosition().lng();

          var placemark = ge.createPlacemark('');
          placemark.setName(mark.getTitle());

          var icon = ge.createIcon('');
          icon.setHref(gray);
          var style = ge.createStyle(''); //create a new style
          style.getIconStyle().setIcon(icon); //apply the icon to the style
          placemark.setStyleSelector(style); //apply the style to the placemark

          var point = ge.createPoint('');
          point.setLatitude(lat);
          point.setLongitude(lng);
          placemark.setGeometry(point);

          ge.getFeatures().appendChild(placemark);

          link = ge.createLink('');
          //var href = 'http://www.gelib.com/maps/_NL/usgs-topographic-maps.kml';
          //var href = 'http://gmaps-samples.googlecode.com/svn/trunk/ggeoxml/cta.kml';
          var href = 'http://www.gearthblog.com/kmfiles/topomaps.kml';
                     
          link.setHref(href);

          networkLink = ge.createNetworkLink('');
          networkLink.set(link, true, true); // Sets the link, refreshVisibility, and flyToView

          try { ge.getFeatures().appendChild(networkLink); }
          catch(err) { 
            console.log("caught " + err);
          }

          var camera = ge.getView().copyAsCamera(ge.ALTITUDE_RELATIVE_TO_GROUND);

          var lookAt = ge.getView().copyAsLookAt(ge.ALTITUDE_RELATIVE_TO_GROUND);
          lookAt.setLatitude(lat);
          lookAt.setLongitude(lng);
          lookAt.setRange(10000);
          ge.getView().setAbstractView(lookAt);
          return false;
        };

        if (earthMode == false) {
          switchToEarth();
          console.log("after ste");

          // let ge load
          globalMarkId = markId;
          setTimeout(markFunc,4000);
        } else {
          markFunc();
        }

      };
    };



    function clickTestPop() {
      var name = 'fred';

      var template = "the winner is <b>%1$s</b>";

      var result = sprintf(template,name);

      $('#popup-template').html(result);
    }


    var searchInfoWindow = new google.maps.InfoWindow();
    var searchMarkers = new Array();

    function clickSearchButton() {
      // remove old markers
      _.each(searchMarkers, function(mrk) {
        mrk.setMap(null);
      });

      searchMarkers = [];

      var request = {
        bounds : map.getBounds(),
        keyword : $('#searchField').val()
      };

      console.log('search term ' + $('#searchField').val() );

      searchService.search(request, function(results,status) {
        if (status == google.maps.places.PlacesServiceStatus.OK) {
          _.each(results,function(result) {
            createMarker(result);
          });
        }
      });

      return false;
    }



    function createMarker(place) {

        var placeLoc = place.geometry.location;
        var placeIco = new google.maps.MarkerImage(place.icon,null,null,null, new google.maps.Size(15,15));
        var marker = new google.maps.Marker({
          icon : placeIco,
          map: map,
          position: place.geometry.location
        });

        searchMarkers.push(marker);

        google.maps.event.addListener(marker, 'click', function() {
          // get details
          var detailRequest = {
            reference : place.reference
          };

          searchService.getDetails(detailRequest, placeDetailCallback);
          return false;
        });

        var placeDetailCallback = function(place,status) {
          var template = 
            "<a target='_blank' href='%2$s'>%1$s</a><br/>" +
            "%3$s"

          var html = sprintf(template, place.name, place.url, place.vicinity);

          if (place.rating) {
            html = html + sprintf("<br/>Rating : %1$s / 5",place.rating);
          }

          searchInfoWindow.setContent(html);

          searchInfoWindow.open(map,marker);
        };
      }


    var weatherLayer;

    var hideWeather = function() {
      weatherLayer.setMap(null);
      $('#toggleWeather').button('toggle');
      var newTitle = $('#toggleWeather').html().replace('Hide','Show');
      $('#toggleWeather').html(newTitle);
    };


    var showWeather = function() {
      weatherLayer = new google.maps.weather.WeatherLayer({
        temperatureUnits: google.maps.weather.TemperatureUnit.FAHRENHEIT
      });
      weatherLayer.setMap(map);
      $('#toggleWeather').button('toggle');
      var newTitle = $('#toggleWeather').html().replace('Show','Hide');
      $('#toggleWeather').html(newTitle);
    };


    var resetMap = function() {
      map.panTo(coCenter);
      map.setZoom(8);
      directionsDisplay.setMap(null);
      _.each(picMarkers,function(pm) {
        pm.setMap(null);
      });
      $('#directions').html('');
    };

    var archCircles = [];

    var archCircleRadiusMi = 5;

    var archURL = "http://scalaeveryday.com:1315/api/wrecks?callback=?"

    var circInfoWindow = new google.maps.InfoWindow();

    var showArchSites = function() {
      $('#arch').button('toggle');
      $('#arch').button('loading');

      var archInfoTemplate =  "<div id='archInfo' class='mapPopup'>" +
        "%(aircraftType)s<br/>" +
        "%(date)s<br/>" +
        "%(location)s<br/>" +
        "%(locDetail.lat)s, %(locDetail.lng)s<br/>" +
        "Pilot: %(pilot)s<br/>" +
        "Serial#: %(serialNum)s<br/>" +
        "<a target='_blank' href='http://www.aviationarchaeology.com/src/dbasn.asp?SN=%(serialNum)s&Submit4=Go'>View on aviationarcheology.com</a>";

      // get circle centers via ajax
      $.getJSON(archURL, function(data) {
        console.log("got record count " + data.length);
        _.each(data,function(archSite) {
          // draw circle
          var circ = new google.maps.Circle( {
            center : new google.maps.LatLng(archSite.locDetail.lat, archSite.locDetail.lng),
            fillColor : "#CE9100",
            fillOpacity : 0.5,
            radius : 8045,
            strokeWeight : 0.5,
            strokeColor : "white"
          });

          circ.setMap(map);

          google.maps.event.addListener(circ, 'click', function() {
            console.log('CIRCLE JERK');
            circInfoWindow.setContent( sprintf(archInfoTemplate, archSite));
            circInfoWindow.setPosition( new google.maps.LatLng(archSite.locDetail.lat, archSite.locDetail.lng));
            circInfoWindow.open(map);
          });

          archCircles.push(circ);
        });
        $('#arch').button('reset');
        return false;
      });

    };

    var hideArchSites = function() {
      $('#arch').button('toggle');
      _.each(archCircles,function(c) {
        c.setMap(null);
      });
    };


    var wreckSearch = function() {
      var searchFieldContents = $('#wreckSearchField').val();
      console.log('searchFieldCon ' + searchFieldContents);

      // zoom in on the mark
      zoomFunc(searchFieldContents.substr(0,4))();
      return false;
    };




    $(document).ready(function() {
      loadMap();
      addWrecks();
      addFoundWrecks();
      addCompleteWrecks();

      $("#xxx").toggle(
        function(){ 
          console.log("ON"); 
          $("#xxx").button('toggle');
        }, 
        
        function() { 
          console.log("OFF"); 
          $("#xxx").button('toggle');
        }
      );

      $("#viewFound").toggle(
        hider("#viewFound", foundWreckMarks), shower("#viewFound", foundWreckMarks));

      $("#allMil").toggle(
        hider("#allMil", allMilMarks), shower("#allMil", allMilMarks));

      $("#complete").toggle(
        hider("#complete", completeMarks), shower("#complete", completeMarks));

      $("#zoomTaylor").click(zoomFunc("m. T"));
      $("#taylorDirections").click(dirFunc("m. T"));
      $("#taylorEarth").click(viewEarthFunc("m. T"));

      $("#zoomYale").click(zoomFunc("l. M"));
      $("#yaleDirections").click(dirFunc("l. M"));
      $("#yaleEarth").click(viewEarthFunc("l. M"));

      $("#zoomCirrus").click(zoomFunc("c. M"));
      $("#cirrusDirections").click(dirFunc("c. M"));
      $("#cirrusEarth").click(viewEarthFunc("c. M"));

      $("#switchEarth").click(switchToEarth);
      $("#switchMaps").click(switchToMaps);

      $('#testpop').click(clickTestPop);

      $('#searchButton').click(clickSearchButton);

      $('#toggleWeather').toggle(
        showWeather, hideWeather);

      $('#arch').toggle(
        showArchSites, hideArchSites
      )

      $('#arch').popover({placement : 'left'});
      $('#viewFound').popover({placement : 'left'});
      $('#allMil').popover({placement : 'left'});
      $('#complete').popover({placement : 'left'});
      $('#searchButton').popover({});
      $('#wreckSearchButton').popover({});
      $('#zoomButton').popover({placement : 'left'});
      $('#toggleWeather').popover({placement : 'left'});
      $('#flickrFullScreen').popover({placement : 'left'});



      $('#flickrFullScreen').click(function() { flickrSearch(0.0,0.0,true); } );

      $('#reset').click(function() { resetMap(); });

      var foundNames = _.map(foundWrecks, function(w) { return w.name; });
      var milNames = _.map(wrecks, function(w) { return w.hint; });
      var completeNames = _.map(completeWrecks, function(w) { return w.hint; });

      $('#wreckSearchField').typeahead({
        source : foundNames.concat(milNames, completeNames),
        items : 4
      });

      $('#wreckSearchButton').click(function() {
        console.log("heye");
        var f = zoomFunc( $('#wreckSearchField').val().substr(0,4) );
        f();
        return false;
      });

      return;
    });

