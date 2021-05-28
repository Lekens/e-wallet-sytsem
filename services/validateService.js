const respHandler = require('../services/responseHandler');
const validator = require('express-validator/check');

const validate = {
    /**
     * Check mongo Id
     * @param res
     * @param req
     * @returns {boolean}
     */
    validateObjectId: (res, req) => {
        const errors = validator.validationResult(req);
        // check if there are errors
        if ( !errors.isEmpty() ) {
            respHandler.sendError(res, 422, 'FAILURE', 'Invalid reference Id');
            return false;
        }
        return true;
    },
    resultFound: function(user) {
        return !!user;
    },
    formatData: function (data) {
        if(!data){
            return null;
        }
        if(data.password){
            data.password = null;
            delete data.password;
        }
        return data;
    },
    isEmptyObject: function (obj) {
        if(null === obj || obj === undefined){
            return true
        } else {
            return (Object.keys(obj).length === 0 && obj.constructor === Object)
        }
    }
};
module.exports = validate;


