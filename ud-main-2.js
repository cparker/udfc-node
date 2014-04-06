

var theMap;

var loadMap = function () {
    var coCenter = new google.maps.LatLng(39.361194, -105.763006);

    var mapOptions = {
        zoom: 8,
        center: coCenter
    };
    theMap = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
};



var attachClicker = function(marker,site) {

    var mapPopupTemplate =
        "<div id='popup-template' class='mapPopup'>" +
        "<h5>" + site.name + "</h5>" +
        "<h5>Lat: " + site.lat + " Lng: " + site.lon +
        "</div>";

    var infoWindow = new google.maps.InfoWindow({
        content : mapPopupTemplate
    });

    google.maps.event.addListener(marker, 'click', function() {
        infoWindow.open(theMap, marker);
    });

};


$('document').ready(function () {
    console.log("REEAAADDDY");

    loadMap();

    // load the stations
    $.getJSON('/foundStations', function (data) {
        var stationListSelector = '#stationTable';

        console.log("results " + JSON.stringify(data));
        $('#total').html('discovered sites ' +data.length);

        _.each(data, function (station) {
            var newTime = moment(station.lastReport);
            $(stationListSelector)
                .append('<tr><td>' + station.name + '</td><td>' + newTime.format("dddd, MMMM Do YYYY, h:mm:ss a") + '</td><td>' + station.distanceFromHome + '</td></tr>');


            var marker = new google.maps.Marker({
                position: new google.maps.LatLng(station.lat,station.lon),
                map: theMap,
                title : station.name
            });

            attachClicker(marker,station);
        });


    });


    return false;

});


