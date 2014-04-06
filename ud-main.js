$(document).ready(function () {
    console.log("ready");

    // load the stations
    $.getJSON('/foundStations', function (data) {
            var stationListSelector = '#stationTable';

            console.log("results " + JSON.stringify(data));

            _.each(data, function (station) {
                var newTime = moment(station.lastReport);
                //$(stationListSelector)
                    //.append('<tr><td>' + station.name + '</td><td>' + newTime.format("dddd, MMMM Do YYYY, h:mm:ss a") + '</td><td>' + station.distanceFromHome + '</td></tr>');
            });




        }
    );

    var coCenter = new google.maps.LatLng(39.361194, -105.763006);

    //var chicago = new google.maps.LatLng(41.875696,-87.624207);
    var mapOptions = {
        zoom: 8,
        center: coCenter
    };


    map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

    //google.maps.event.addDomListener(window, 'load', initialize);

    map.panTo(coCenter);
    map.setZoom(8);

    console.log("map is ");
    console.dir(map);

});

