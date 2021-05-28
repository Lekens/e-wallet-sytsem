
const express = require('express');
const validateService = require('../services/validateService');
const controllerService = require('../services/controllerServices');
const Profile = require('../controllers/Profile');
const validator = require('express-validator/check');
const ProfileRouter = express.Router();

/**
 *  Generic Profile apis.
 *  */

ProfileRouter.route('/bank-setting/:userId')
    .post((req, res, next) => controllerService.checkAuthorizationToken(req, res, next),
        (req, res, next) => Profile.createBankInformation(req, res))
    .get([validator.param('userId').isMongoId().trim()], (req, res, next) => {
        if(validateService.validateObjectId(res, req)) {
            controllerService.checkAuthorizationToken(req, res, next, ['USER', 'ADMIN']);
        }
    }, (req, res, next) => Profile.getBankInformation(req, res, next))
    .put([validator.param('userId').isMongoId().trim()], (req, res, next) => {
        if(validateService.validateObjectId(res, req)) {
            controllerService.checkAuthorizationToken(req, res, next);
        }
    }, (req, res, next) => Profile.putBankInformation(req, res, next));

ProfileRouter.route('/list-banks')
    .get((req, res, next) => Profile.getBanks(req, res, next));

module.exports = ProfileRouter;
