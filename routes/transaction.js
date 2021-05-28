
const express = require('express');
const validateService = require('../services/validateService');
const controllerService = require('../services/controllerServices');
const Transaction = require('../controllers/Transaction');
const validator = require('express-validator/check');
const TransactionRouter = express.Router();

/**
 *  Generic Transaction apis.
 *  */
TransactionRouter.route('/')
    .get((req, res, next) => controllerService.checkAuthorizationToken(req, res, next, ['ADMIN']),
        (req, res, next) => Transaction.getTransactions(req, res, next));

TransactionRouter.route('/by/paystack-transaction')
    .get((req, res, next) => controllerService.checkAuthorizationToken(req, res, next, ['ADMIN']),
        (req, res, next) => Transaction.getPaystackTransactions(req, res, next));

TransactionRouter.route('/by/bank-transaction')
    .get((req, res, next) => controllerService.checkAuthorizationToken(req, res, next, ['ADMIN']),
        (req, res, next) => Transaction.getBankTransactions(req, res, next));

TransactionRouter.route('/:id')
    .get([validator.param('id').isMongoId().trim()], (req, res, next) => {
        if(validateService.validateObjectId(res, req)) {
            controllerService.checkAuthorizationToken(req, res, next);
        }
    }, (req, res, next) => Transaction.getTransaction(req, res, next))
    .put([validator.param('id').isMongoId().trim()], (req, res, next) => {
        if(validateService.validateObjectId(res, req)) {
            controllerService.checkAuthorizationToken(req, res, next, ['ADMIN']);
        }
    }, (req, res, next) => Transaction.putTransaction(req, res, next))
    .delete([validator.param('id').isMongoId().trim()], (req, res, next) => {
        if(validateService.validateObjectId(res, req)) {
            controllerService.checkAuthorizationToken(req, res, next, ['ADMIN']);
        }
    }, (req, res, next) => Transaction.deleteTransaction(req, res, next));
TransactionRouter.route('/payment-reference/:ref')
    .get((req, res, next) => controllerService.checkAuthorizationToken(req, res, next),
        (req, res, next) => Transaction.getTransactionByRef(req, res));

TransactionRouter.route('/user/:userId')
    .get((req, res, next) => controllerService.checkAuthorizationToken(req, res, next),
        (req, res, next) => Transaction.getUserTransactions(req, res));

TransactionRouter.route('/filter-transaction')
    .post((req, res, next) => Transaction.filterTransaction(req, res));

TransactionRouter.route('/search-transaction')
    .post((req, res, next) => Transaction.searchTransaction(req, res));

module.exports = TransactionRouter;
