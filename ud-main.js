$(document).ready(function () {
    console.log("ready");

    // load the stations
    $.getJSON('/foundStations', function (data) {
        var stationListSelector = '#stationTable';


        console.log("results " + JSON.stringify(data));

        _.each(data, function (station) {
            var newTime = moment(station.lastReport);
            $(stationListSelector)
                .append('<tr><td>' + station.name + '</td><td>' + newTime.format("dddd, MMMM Do YYYY, h:mm:ss a") + '</td><td>' + station.distanceFromHome + '</td></tr>');
        });
    });


});

