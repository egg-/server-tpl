/**
 * app.js: application
 */

'use strict';

var express = require('express');
var logger = require('morgan');
var bodyParser = require('body-parser');
var notifier = require('log-notifier');
var app = express();
var api = require('./api');

var config = api.config('../conf/config.yml');

// load routes
var routes = {

};

app.disable('x-powered-by');
if (app.get('env') === 'development') {
    app.use(logger('dev'));
    app.use(function(req, res, next) {
        res.elapsed_time = process.hrtime();
        next();
    });
} else {
    app.use(logger('combined'));

    // override notifier
    config.hipchat.prefix = require('os').hostname();
    api.notifier = new notifier.Hipchat(config.hipchat);
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// enable cors
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Request-Method', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', [
        'Authorization', 
        'Content-Type'
    ].join(', '));

    if (req.method === 'OPTIONS') {
        res.send(204);
    } else {
        next();
    }
});

// define route
for (var k in routes) {
    app.use(k, routes[k]);
}

process.on('uncaughtException', function (err) {
    api.notifier.error(err.stack);
});

// 404 error handler
app.use(function(req, res, next) {
    next({
        type: 'common.unsupported',
        code: 404,
        message: 'Unsupported API'
    });
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        if (err instanceof SyntaxError) {
            err = 'common.invalid_json_string';
        }
        console.error(err.stack);
        api.error(err, req, res);
    });
}

// error handler 
app.use(function(err, req, res, next) {
    api.error(err, req, res);
});

module.exports = app;