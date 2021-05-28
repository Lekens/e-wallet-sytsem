const express = require('express');
const validateService = require('../services/validateService');
const controllerService = require('../services/controllerServices');
const users = require('../controllers/Users');
const validator = require('express-validator/check');
const userRouter = express.Router();

/**
 *  Generic users apis.
 *  */
userRouter.route('/')
    .get((req, res, next) => controllerService.checkAuthorizationToken(req, res, next, ['ADMIN']), (req, res, next) => users.getUsers(req, res, next));

userRouter.route('/:id')
    .get([validator.param('id').isMongoId().trim()], (req, res, next) => {
        if(validateService.validateObjectId(res, req)) {
            controllerService.checkAuthorizationToken(req, res, next, ['USER', 'ADMIN']);
        }
    }, (req, res, next) => users.getUser(req, res, next))

    .put([validator.param('id').isMongoId().trim()], (req, res, next) => {
        if(validateService.validateObjectId(res, req)) {
            controllerService.checkAuthorizationToken(req, res, next, ['ADMIN', 'USER']);
        }
    }, (req, res, next) => users.putUser(req, res, next))

    .delete([validator.param('id').isMongoId().trim()], (req, res, next) => {
        if(validateService.validateObjectId(res, req)) {
            controllerService.checkAuthorizationToken(req, res, next, ['ADMIN']);
        }
    }, (req, res, next) => users.deleteUser(req, res, next));

module.exports = userRouter;
