
const express = require('express');
const validateService = require('../services/validateService');
const controllerService = require('../services/controllerServices');
const Wallet = require('../controllers/Wallet');
const FundWallet = require('../controllers/FundWallet');
const validator = require('express-validator/check');
const WalletRouter = express.Router();

/**
 *  Generic Wallet apis.
 *  */

WalletRouter.route('/withdraw')
.post((req, res, next) => controllerService.checkAuthorizationToken(req, res, next),
    (req, res, next) => Wallet.withdrawWallet(req, res));

WalletRouter.route('/fund')
.post((req, res, next) => controllerService.checkAuthorizationToken(req, res, next),
    (req, res, next) => FundWallet.fundWallet(req, res));


WalletRouter.route('/verify-paystack-payment')
    .post((req, res, next) => controllerService.checkAuthorizationToken(req, res, next),
        (req, res, next) => FundWallet.verifyPayment(req, res));

WalletRouter.route('/verify-bank-transfer')
    .post((req, res, next) => controllerService.checkAuthorizationToken(req, res, next, ['ADMIN']),
        (req, res, next) => FundWallet.confirmBankTransfer(req, res));


WalletRouter.route('/user/:userId')
    .get([validator.param('userId').isMongoId().trim()], (req, res, next) => {
        if(validateService.validateObjectId(res, req)) {
            controllerService.checkAuthorizationToken(req, res, next);
        }
    }, (req, res, next) => Wallet.getUserWallet(req, res, next));



WalletRouter.route('/withdrawal-history')
    .get((req, res, next) => controllerService.checkAuthorizationToken(req, res, next, ['ADMIN']),
        (req, res, next) => Wallet.listWithdrawalHistory(req, res));


WalletRouter.route('/withdrawal-history/user/:userId')
    .get([validator.param('userId').isMongoId().trim()], (req, res, next) => {
        if(validateService.validateObjectId(res, req)) {
            controllerService.checkAuthorizationToken(req, res, next);
        }
    }, (req, res, next) => Wallet.listUserWithdrawalHistory(req, res, next));

module.exports = WalletRouter;
