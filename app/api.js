/**
 * api.js: api controller
 */

'use strict';

var _ = require('lodash');
var notifier = require('log-notifier');
var message = require('simple-message');
var yaml = require('yamljs');

/**
 * @namespace api
 */
var api = {};

/**
 * @memberOf api
 * @type {notifier}
 */
api.notifier = new notifier.Logger({
    prefix: require('os').hostname()
});


/**
 * api 요청을 처리하기 위한 기본 환경 설정.
 * @method init
 * @memberOf api
 * @param {Request} req 
 * @param {Response} res 
 * @param {Function} next 
 */
api.init = function(req, res, next) {
    req.api = req.api || {
        token: null
    };

    var authorization = req.get('authorization');
    if (authorization) {
        authorization = authorization.split(' ');
        if (authorization.length !== 2) {
            return api.error('common.invalid_authentication', req, res);
        }

        req.api.token = {
            grant_type: authorization[0],
            access_token: authorization[1]
        };
    }

    next();
};

/**
 * 결과 값 출력.
 * @method send
 * @memberOf api
 * @param {Request} req 
 * @param {Response} res
 * @param {object} result
 * @param {boolean} success
 * @return {api~RESULT}
 */
api.send = function(req, res, result, success) {
    // add nonce & elapsed_time
    if (res.elapsed_time) {
        var diff = process.hrtime(res.elapsed_time);
        result['elapsed_time'] = diff[0] / 1000 + diff[1] / 1000000;
    }
    result['success'] = !! success;
    result['nonce'] = req.body.nonce || req.query.nonce;

    return res.json(result);
};

/**
 * error 결과 값 출력.
 * @method error
 * @memberOf api
 * @param {string | message~error} err error type or object
 * @param {Request} req 
 * @param {Response} res 
 * @param {Error} [origin] original error
 * @return {api~ERROR} 
 */
api.error = function(err, req, res, origin) {
    var error = message.error.get(err);

    if (typeof origin !== 'undefined') {
        api.notifier.error(origin);
    }

    res.status(error.code || err.status || 500);
    api.send(req, res, {
        error: error
    }, false);
};

/**
 * 지정된 yml 파일 로드
 * @method error
 * @memberOf api
 * @param {string} path
 * @return {object}
 */
api.config = function(path) {
    return yaml.load(__dirname + '/' + path);
};

api.validator = {
    /**
     * token 정보 확인. access_token 필요.
     * token 정보가 없는 경우 common.not_exist_token 에러 발생.
     * @method token
     * @memberOf ctrl.api.validator
     * @param {Request} req 
     * @param {Response} res
     * @param {Function} next
     */
    token: function(req, res, next) {
        if (req.api.token) {
            return next();
        }

        api.error('common.not_exist_token', req, res);
    },
    /**
     * 파라메터 전달 여부 체크.
     * @method mandatory
     * @memberOf api.validator
     * @param {array|object} params 검사할 대상
     * @param {string} [target] body or query or params
     * @example
     * mandatory(['key1', 'key2'], 'body');
     * mandatory({ user: ['email', 'passwd'] }, 'body');
     */
    mandatory: function(params, target) {
        target = target || 'query';

        var check = function(fields, param) {
            for (var i = 0; i < fields.length; i++) {
                if (typeof param[fields[i]] === 'undefined') {
                    return false;
                }
            }

            return true;
        };

        return function(req, res, next) {
            if (typeof params === 'string') {
                params = [params];
            }
            
            if (_.isArray(params) === true) {
                if (check(params, req[target]) === false) {
                    return api.error('common.missing_required_parameter', req, res);
                }

                next();
            } else if (_.isPlainObject(params) === true) {
                for (var key in params) {
                    if (params.hasOwnProperty(key) === false) {
                        continue;
                    }

                    // form-urlencoded
                    if (typeof req[target][key] === 'string') {
                      req[target][key] = JSON.parse(req[target][key]);
                    }
                    if (typeof req[target][key] === 'undefined' || check(params[key], req[target][key]) === false) {
                        return api.error('common.missing_required_parameter', req, res);
                    }
                }

                next();
            }
        };
    },
};

/**
 * @typedef {object} api~RESULT
 * @property {object} mixed undefiend object
 * @property {float} [elapsed_time] elpased time for development
 * @property {boolean} success success or fail
 * @property {string} nonce response를 구분하기 위한 값
 * @example
 * {
  "channel": {
    "ch_no": "2"
  },
  "elapsed_time": 0.412134,
  "success": true,
  "nonce": "da8fadf"
}
 */

/**
 * @typedef {object} api~ERROR
 * @property {object} error
 * @property {string} error.type error type (`common.unexpected_parameter`)
 * @property {number} error.code error code (`400`, `403`)
 * @property {string} error.message error message.
 * @property {float} [elapsed_time] elpased time for development
 * @property {boolean} success success or fail
 * @property {string} nonce response를 구분하기 위한 값
 * @example
 * {
  "error": {
    "type": "common.unexpected_parameter",
    "code": 400,
    "message": "The request specifies an unexpected parameter."
  },
  "elapsed_time": 5.251047,
  "success": false,
  "nonce": "nonce"
}
 */

module.exports = api;