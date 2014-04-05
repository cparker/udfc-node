var MongoClient = require('mongodb').MongoClient, format = require('util').format;
var _ = require('underscore');
var Q = require('q');


var myFunc = function (x) {
    var def = Q.defer();

    def.resolve("you are so cool");
    return def.promise;
};


myFunc('hey')
    .then(function (res) {
        console.log("got back " + res);
        return "hey hey";
    })
    .then(function (x) {
        console.log("x is " + x);
        return [1, 2, 3, 4];
    })
    .spread(function (a, b, c, d) {
        console.log("a " + a + " b " + b);
    })
    .then(function(){
        console.log("la de da");
        throw("die");
    })
    .fail(function (f) {
        console.log("we're in a fail " + f);
    })
    .done(function () {
        console.log("we're in a done");
    });


var names = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

var processOneName = function (index) {
    var def = Q.defer();
    if (index > names.length) {
        def.reject("done");
    } else {
        def.resolve(names[index]);
    }
    return def.promise;
};


var doProcessNames = function (index) {
    processOneName(index)
        .then(function (letter) {
            // recurse
            console.log("working on " + letter);
            doProcessNames(index + 1);
        })
        .fail(function () {
            // we're done

        })
};

doProcessNames(0);

function iterateUntil(endValue) {
    // This line would eventually resolve the promise with something matching
    // the final ending condition.
    return Q.resolve('some value')
        .then(function (value) {
            // If the promise was resolved with the loop end condition then you just
            // return the value or something, which will resolve the promise.
            if (value == endValue) return value;

            // Otherwise you call 'iterateUntil' again which will replace the current
            // promise with a new one that will do another iteration.
            else return iterateUntil(endValue);
        });
}