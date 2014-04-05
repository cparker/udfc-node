var MongoClient = require('mongodb').MongoClient, format = require('util').format;
var _ = require('underscore');
var Q = require('q');
var express = require('express');
var app = express();
var geo = require('geolib');

var home = {
    latitude: 39.966464,
    longitude: -105.159251
};

var milesPerMeter = 0.000621371;

// make promise methods out of basic mongo methods
var syncFind = function (db, colName, query, sort, limit) {
    var def = Q.defer();
    db.collection(colName).find(query, {limit: limit}).sort(sort).toArray(function (err, results) {
        if (err) {
            def.reject(err);
        } else {
            def.resolve(results);
        }
    });
    return def.promise;
};

var syncFindOne = function (db, colName, query) {
    var def = Q.defer();
    db.collection(colName).findOne(query, function (err, result) {
        if (err)
            def.reject(err);
        else
            def.resolve(result);

    });
    return def.promise;
};

var syncUpdate = function (db, colName, selector, record) {
    var def = Q.defer();
    db.collection(colName).update(selector, record, {w: 1}, function (err, rec) {
        if (err) {
            def.reject(err);
        } else {
            def.resolve(rec);
        }
    });
};

var syncInsert = function (db, colName, record) {
    var def = Q.defer();
    db.collection(colName).insert(record, {w: 1}, function (err, rec) {
        if (err) {
            def.reject(err);
        } else {
            def.resolve(rec);
        }

    });

};

var syncConnect = function (url) {
    var def = Q.defer();
    MongoClient.connect('mongodb://localhost:27017/urbanDrainage', function (err, db) {
        if (err) {
            def.reject(err);
        } else {
            def.resolve(db);
        }
    });
    return def.promise;
};

var computeDistanceMiles = function (p1, p2) {
    return geo.getDistance(p1, p2) * milesPerMeter;
};

// basic REST HTTP
app.get('/hello.txt', function (req, res) {
    res.send('Hello World');
});

app.get('/foundStations', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    var dbCon;
    syncConnect('mongodb://localhost:27017/urbanDrainage')
        .then(function (db) {
            dbCon = db;
            return syncFind(db, 'foundStations', {}, {lastReport: -1});
        })
        .then(function (foundStations) {
            res.end(JSON.stringify(foundStations))
        })
        .finally(function(){
            dbCon.close();
        })
        .fail(function (err) {
            res.end(err.toString());
        })
});


app.configure(function () {
    app.use(express.static(__dirname));
});

var server = app.listen(3000, function () {
    console.log('Listening on port %d', server.address().port);
});


var processOneStation = function (db) {
    var def = Q.defer();
    var unprocessedStation = null;

    syncFindOne(db, 'receivedStations', {processed: {"$exists": false}})
        .then(function (us) {
            if (us) {
                console.log("looking for device_alias of " + us.stationID.toString());
                unprocessedStation = us;
                return [us.stationID.toString(), syncFindOne(db, 'sensors', {"properties.device_alias": us.stationID.toString()})];
            } else {
                throw {
                    reason: "no more records",
                    code: 0
                }
            }
        })
        .spread(function (devAlias, stationDetails) {
            if (stationDetails == null) {
                throw {
                    reason: "Didn't find station for device alias " + devAlias,
                    code: 1
                }
            }
            return [stationDetails, syncFindOne(db, 'foundStations', {stationID: stationDetails.properties.site_alias})];
        })
        .spread(function (stationDetails, foundStation) {
            if (foundStation == null) {
                console.log("inserting new station for " + stationDetails.properties.name);

                var stationPoint = {
                    latitude: stationDetails.geometry.coordinates[1],
                    longitude: stationDetails.geometry.coordinates[0]
                };

                var distanceFromHome = computeDistanceMiles(stationPoint, home);

                var newFoundStation = {
                    stationID: stationDetails.properties.site_alias,
                    firstReport: new Date(),
                    name: stationDetails.properties.name,
                    sensorType: stationDetails.properties.type,
                    lon: stationDetails.geometry.coordinates[0],
                    lat: stationDetails.geometry.coordinates[1],
                    lastReport: new Date(),
                    distanceFromHome: distanceFromHome
                };

                // insert a new foundStation
                return syncInsert(db, 'foundStations', newFoundStation);
            }
            else {
                console.log("updating existing station " + foundStation.name);
                foundStation.lastReport = new Date();
                return syncUpdate(db, 'foundStations', {"_id": foundStation._id}, foundStation);

            }
        })
        .fail(function (err) {
            console.log("in main fail");
            console.dir(err);
        })
        .finally(function () {
            console.log("done");
            if (unprocessedStation) {
                // mark record as processed
                console.log("marking as processed");
                unprocessedStation.processed = true;
                syncUpdate(db, 'receivedStations', {"_id": unprocessedStation._id}, unprocessedStation);

                def.resolve();
            } else {
                def.reject();
            }
        })
        .done();

    return def.promise;

};


var processStations = function (db, prom) {
    var def = Q.defer();
    prom
        .then(function () {
            processStations(db, processOneStation(db));
        })
        .fail(function (err) {
            console.log("we're done\n" + err);
            def.resolve(); // because this is how we know we're done
        })
        .finally(function () {
        })
        .done();

    return def.promise;
};


setInterval(function () {
    console.log("\n\n\nSTARTING\n\n\n");
    MongoClient.connect('mongodb://localhost:27017/urbanDrainage', function (err, db) {
        processStations(db, processOneStation(db))
            .then(function(){
                db.close();
            })
    });

}, 30 * 1000);

