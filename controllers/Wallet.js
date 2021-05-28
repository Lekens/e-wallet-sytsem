const Wallet = require('../models/Wallet');
const User = require('../models/Users');
const BankInformation = require('../models/BankSetting');
const Transaction = require('../models/Transaction');
const WithdrawalHistory = require('../models/WithdrawalHistory');
const respHandler = require('../services/responseHandler');
const validate = require('../services/validateService');
const controllerService = require('../services/controllerServices');
const bcrypt = require('bcrypt');
const nanoid = require('nanoid');


const WalletController = {
    /**
     * Due to insufficient resources, withdrawal process will look manual but code to perform actual will be implemented
     * @param req
     * @param res
     */
    withdrawWallet: async (req, res) => {
        // Authenticate the user using password
        const {userId, password, amount, narration} = req.body;
        controllerService.getLoginUser(req, 'userId', async (_userId) => {
            if (userId !== _userId) {
                // You can;t withdraw on someone's behave.
                respHandler.sendError(res, 401, 'FAILURE', 'Invalid withdrawal request', {});
            } else {
                const user = await User.findById(userId, 'password _id');
                // check password
                bcrypt.compare(password, user.password, async (error, response) => {
                    if (!response) {
                        respHandler.sendError(res, 401, 'FAILURE', 'Authentication failed, kindly check your credential', error);
                    } else {
                        const bankInfo = await BankInformation.findOne({userId});
                        if(!bankInfo || bankInfo.verified === false) {
                            respHandler.sendError(res, 400, 'FAILURE', 'Bank account not found or bank account not verified!, kindly update you bank account using profile api');
                        } else {
                            // check if user have sufficient amount in their wallet
                            const wallet = await Wallet.findOne({userId});
                            const formattedAmountToWithdraw = parseFloat(amount);
                            if(wallet && wallet.wallet_balance && parseFloat(wallet.wallet_balance) >= formattedAmountToWithdraw) {
                                // Perform withdrawal from wallet
                                // create debit transaction
                                // create withdrawal history
                                // Send actual money to user bank account
                                // Send mail about wallet withdrawal
                                const oldBalance = parseFloat(wallet.wallet_balance);
                                const newBalance = oldBalance - formattedAmountToWithdraw;

                                Wallet.findByIdAndUpdate(wallet._id, {$set: {wallet_balance: newBalance}}, {new: true}, (updateError, updateSuccess) => {
                                    if(updateError) {
                                        respHandler.sendError(res, 401, 'FAILURE', 'Withdrawal failed, please retry', updateError);
                                    } else {
                                        const generateRef = `${controllerService.getRandomInt(9999999)}-${nanoid(6)}-${controllerService.getRandomInt(9999)}`;
                                        const narrate = `Withdrawal from wallet`;
                                        // Create the order first for tracking

                                        const trans = {
                                            paymentReference: generateRef,
                                            amount: formattedAmountToWithdraw,
                                            type: 'DEBIT',
                                            status: 'COMPLETED',
                                            new_wallet_balance: newBalance,
                                            old_wallet_balance: wallet.wallet_balance,
                                            payment_channel: 'BANK_TRANSFER', // PAYSTACK,
                                            userId,
                                            narration: narrate
                                        };

                                        WithdrawalHistory.create({narration: narration, userId: userId, amount_withdrawn: formattedAmountToWithdraw}, async (historyError, createHistory) => {
                                            if(historyError) {
                                                respHandler.sendError(res, 400, 'FAILURE', 'Unable to withdrawal history', historyError);
                                            } else {
                                             // Money sent by ADMIN using Bank app
                                             // Send a mail to the customer
                                               const createTransaction =  await Transaction.create(trans);
                                               if(createTransaction) {
                                                   // res
                                                   respHandler.sendSuccess(res, 200, 'Withdrawal from wallet is successful!');
                                               }
                                            }
                                        });
                                    }
                                });

                            } else {
                                respHandler.sendError(res, 400, 'FAILURE', 'Insufficient wallet balance!');
                            }
                        }

                    }
                });
            }
        });
    },
    getUserWallet: (req, res) => {
        try {
            Wallet.findOne({userId: req.params.userId}).exec((err, wallet) => {
                if (err || !wallet){
                    respHandler.sendError(res, 404, 'FAILURE', 'Unable to get user wallet.', err);
                } else if (validate.resultFound(wallet, res)) {
                    const data = validate.formatData(wallet);
                    respHandler.sendSuccess(res, 200, 'User wallet fetched successfully', data);
                }
            })
        } catch(err) {
            respHandler.sendError(res, 404, 'FAILURE', 'Unable to get user wallet.', err);
        }
    },
    listWithdrawalHistory: (req, res) => {
        try {
            WithdrawalHistory.find({}).exec((err, history) => {
                if (err || !history){
                    respHandler.sendError(res, 404, 'FAILURE', 'Unable to list withdrawal history.', err);
                } else if (validate.resultFound(history, res)) {
                    const data = validate.formatData(history);
                    respHandler.sendSuccess(res, 200, 'Withdrawal history fetched successfully', data);
                }
            })
        } catch(err) {
            respHandler.sendError(res, 404, 'FAILURE', 'Unable to list withdrawal history.', err);
        }
    },
    listUserWithdrawalHistory: (req, res) => {
        try {
            WithdrawalHistory.find({userId: req.params.userId}).exec((err, history) => {
                if (err || !history){
                    respHandler.sendError(res, 404, 'FAILURE', 'Unable to list user withdrawal history.', err);
                } else if (validate.resultFound(history, res)) {
                    const data = validate.formatData(history);
                    respHandler.sendSuccess(res, 200, 'User withdrawal history fetched successfully', data);
                }
            })
        } catch(err) {
            respHandler.sendError(res, 404, 'FAILURE', 'Unable to list user withdrawal history.', err);
        }
    }
};

module.exports = WalletController;