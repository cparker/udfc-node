var MongoClient = require('mongodb').MongoClient, format = require('util').format;
var _ = require('underscore');
var Q = require('q');

MongoClient.connect('mongodb://localhost:27017/urbanDrainage', function (err, db) {
    db.collection('sensors').findOne({}, function (err, results) {
        console.log(results);
    });
});
