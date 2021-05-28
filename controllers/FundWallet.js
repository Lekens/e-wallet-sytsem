
const User = require('../models/Users');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const respHandler = require('../services/responseHandler');
const controllerService = require('../services/controllerServices');
const nanoid = require('nanoid');
const request = require('request');
const winston = require('../config/winston');
const moment = require('moment');

const FundWalletController = {
    fundWallet: (req, res) => {
        try {
            const {payment_gateway, amount, userId} = req.body;
            const availableGateways = ['PAYSTACK', 'BANK_TRANSFER']; // TODO: put this in a model in the future
            if(!availableGateways.includes(payment_gateway.toUpperCase())) {
                respHandler.sendError(res, 400, 'FAILURE', 'Payment gateway not allow, choose between paystack and bank_transfer', {});
            } else {
                controllerService.getLoginUser(req, 'userId', (_userId) => {
                    if(userId !== _userId) {
                        // Can only fund personal wallet for this version
                        respHandler.sendError(res, 401, 'FAILURE', 'Unable to proceed with wallet funding, invalid credentials', {});
                    } else {
                        // Maximum fundable is 1 Million (Test mode)
                        if(amount > 1000000) {
                            respHandler.sendError(res, 401, 'FAILURE', 'Amount is beyond allow limit', {});
                        } else {
                            FundWalletController.proceedToPaymentInit(req, res);
                        }
                    }
                });
            }
        } catch(err) {
            respHandler.sendError(res, 404, 'FAILURE', 'Unable to fund wallet.', err);
        }
    },
    proceedToPaymentInit: (req, res) => {
        const {amount, userId, payment_gateway} = req.body;
        const generateRef = `${controllerService.getRandomInt(9999999)}-${nanoid(4)}-${controllerService.getRandomInt(9999)}`;
        const narrate = `Funding of Wallet via ${payment_gateway.toLowerCase()}`;
        // Create the order first for tracking
        Transaction.create({paymentReference: generateRef,
            amount,
            type: 'CREDIT',
            status: 'CREATED',
            payment_channel: payment_gateway.toUpperCase(),
            userId,
            narration: narrate
        } , (err, transaction) => {
            if(err) {
                respHandler.sendError(res, 400, 'FAILURE', 'Unable to generate payment link', err);
            } else if(transaction) {
                FundWalletController.decideOnPayment(req, res, transaction);
            } else {
                respHandler.sendError(res, 400, 'FAILURE', 'Unable to save transaction data', err);
            }
        });
    },
    decideOnPayment: (req, res, transaction) => {
        const payment_gateway = req.body.payment_gateway.toLowerCase();
        switch (payment_gateway) {
            case 'paystack': {
                usePayStack(req, res, transaction);
                break;
            }
            case 'bank_transfer': {
                transferToBankAccount(res, transaction);
                break;
            }
            default: {
                usePayStack(req, res, transaction);
                break;
            }
        }
    },
    verifyPayment: (req, res) => {
        try {
            const transId = req.body.transactionId;
            if(transId) {
                Transaction.findById(transId, (err, transaction) => {
                    if(err) {
                        respHandler.sendError(res, 404, 'FAILURE', 'Transaction does not exist on our system!', err);
                    } else {
                        verifyPayment(transaction.paystack_ref, (erro, body, statusCode) => {
                            const response = JSON.parse(body);
                            if(erro) {
                                Transaction.findByIdAndUpdate(transId, {$set: {status: 'FAILED'}}, {new: true}, () => {});
                                respHandler.sendError(res, 401, 'FAILURE', 'Unable to confirm paystack payment!', erro);
                            } else if(statusCode !== 200){
                                Transaction.findByIdAndUpdate(transId, {$set: {status: 'FAILED'}}, {new: true}, () => {});
                                respHandler.sendError(res, 401, 'FAILURE', 'Unable to verify paystack payment, please retry!', erro);
                            } else {
                                if(response.data.status === 'success') {
                                    // if you want to auto charge in the feature save authorization
                                    const authorization = response.data.authorization;
                                    approveWalletFunding(res, transaction, (success) => {
                                        respHandler.sendSuccess(res, 200, response.message + ', wallet credited!', {
                                            body: response,
                                            data: success
                                        });
                                    });
                                } else {
                                    Transaction.findByIdAndUpdate(transId, {$set: {status: 'FAILED', paystack_status: response.data.status}}, {new: true}, () => {});
                                    respHandler.sendError(res, 401, 'FAILURE', 'Unable to verify paystack payment, please retry!', response);
                                }
                            }
                        });
                    }
                });
            } else {
                respHandler.sendError(res, 400, 'FAILURE', 'Unable to verify payment.', {});
            }
        } catch (error) {
            respHandler.sendError(res, 400, 'FAILURE', 'Unable to verify payment.', error);
        }
    },
    confirmBankTransfer: (req, res) => {
        const {transactionId } = req.body;
        // Payment received? then confirm the transaction in case there is need for refund if wallet fail
        Transaction.findByIdAndUpdate(transactionId, {$set: {status: 'CONFIRMED'}}, {new: true}, (error, transaction) => {
            if(error) {
                respHandler.sendError(res, 400, 'FAILURE', 'Unable to confirm transaction', error);
            } else {
                approveWalletFunding(res,  transaction, (response) => {
                    respHandler.sendSuccess(res, 200, 'Bank transfer payment completed, wallet credited!', {
                        data: response
                    });
                });

            }
        })
    },
    cancelTransaction: (req, res) => {
        const {transactionId } = req.body;
        Transaction.findByIdAndUpdate(transactionId, {$set: {status: 'CANCELED'}}, {new: true}, (error, transaction) => {
            if(error) {
                respHandler.sendError(res, 400, 'FAILURE', 'Unable to cancel transaction', error);
            } else {
                BankPaymentProof.findOneAndUpdate({transactionId: transaction._id}, {$set: { is_confirmed: true, condition: 'Transaction Canceled' }}, {new: true}, (err, bankProofSus) => {   });
                respHandler.sendSuccess(res, 200, 'Transaction canceled successfully', {});
            }
        })
    },
    reInitTransaction: (req, res) => {
        const {transactionId } = req.body;
        Transaction.findByIdAndUpdate(transactionId, {$set: {status: 'INITIATED'}}, {new: true}, (error, transaction) => {
            if(error) {
                respHandler.sendError(res, 400, 'FAILURE', 'Unable to re-initiate transaction', error);
            } else {
                BankPaymentProof.findOneAndUpdate({transactionId: transaction._id}, {$set: { is_confirmed: false, condition: 'Transaction Re-Initiated' }}, {new: true}, (err, bankProofSus) => {   });
                respHandler.sendSuccess(res, 200, 'Transaction re-initiated successfully', {});
            }
        })
    },
    getUserSavedCards: (req, res) => {
        const {userId } = req.params;
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        console.log('DATE ', userId, parseInt(year, 10), parseInt(month, 10));
        PaystackReference.find({$and: [{userId: userId}, {reusable: true}, {exp_year: {$gte: parseInt(year, 10)}}]},
            (error, savedCards) => {
            if(error) {
                respHandler.sendError(res, 400, 'FAILURE', 'Unable to list saved cards', error);
            } else {
                respHandler.sendSuccess(res, 200, 'Saved cards listed successfully', savedCards);
            }
        })
    },
    deleteSavedCard: (req, res) => {
        try {
            controllerService.getLoginUser(req, 'userId', (deletedBy) => {
                PaystackReference.delete({_id: req.params.id}, deletedBy, (err) => {
                    if (err){
                        respHandler.sendError(res, 404, 'FAILURE', 'Unable to delete saved card.', err);
                    }
                    cancelCard(() => {
                        respHandler.sendSuccess(res, 200, 'Card deleted successfully!', {});
                    });
                });
            });

        } catch (err) {
            respHandler.sendError(res, 400, 'FAILURE', 'Unable to delete card');
        }
    },
};

module.exports = FundWalletController;

function approveWalletFunding(res, transaction, cb=null) {
    Wallet.findOne({userId: transaction.userId}, (walletError, walletSuccess) => {
        if(walletError || !walletSuccess) {
            winston.logger.log('error', `Error: Unable to find wallet data ---- ${JSON.stringify(transaction)}`);
            respHandler.sendError(res, 401, 'FAILURE', 'Unable to credit wallet balance!', walletError);
        } else {
            let wallet_balance = parseFloat(walletSuccess.wallet_balance) || 0;
            let amountToInput  = parseFloat(transaction.amount) || 0;
            let new_wallet_balance = wallet_balance + amountToInput;
            Transaction.findByIdAndUpdate(transaction._id, {$set: {old_wallet_balance: wallet_balance, new_wallet_balance}}, {new: true}, (err, update) => {
                if(err) {
                    respHandler.sendError(res, 401, 'FAILURE', 'Unable to update transaction after funding!', err);
                } else {
                    Wallet.findByIdAndUpdate(walletSuccess._id, {$set: {wallet_balance: new_wallet_balance, last_fund_date: moment.now()}}, {new: true}, (errUpdate, sucUpdate) => {
                        if(errUpdate) {
                            winston.logger.log('error', `Error: Unable to update wallet balance after funding ---- ${JSON.stringify(errUpdate)} --- ${JSON.stringify(walletSuccess)}`);
                            respHandler.sendError(res, 401, 'FAILURE', 'Unable to update wallet balance after funding!', errUpdate);
                        } else {
                            Transaction.findByIdAndUpdate(transaction._id, {$set: {status: 'COMPLETED'}}, {new: true}, (err, update) => {
                                if(cb) {
                                    cb(sucUpdate);
                                } else {
                                    respHandler.sendSuccess(res, 200, 'Transaction completed, wallet credited!')
                                }
                            });
                        }
                    });
                }
            });
        }
    })
}


function usePayStack(req, res, transaction) {
    User.findById(transaction.userId, (err, user) => {
        if(err) {
            respHandler.sendError(res, 401, 'FAILURE', 'Error while processing payment!', err);
        } else {
            controllerService.calculateTransactionCharge(transaction.amount, (charge, subTotal, amountToPay) => {
                initializePayment({
                    email: user.email, full_name: user.full_name,
                    first_name: user.first_name, last_name: user.last_name,
                    amount: amountToPay,
                    transaction: transaction.toJSON()
                }, (error, body, statusCode) => {
                    if(error){
                        //handle errors
                        respHandler.sendError(res, 401, 'FAILURE', 'Error while processing payment by paystack!', error);
                    } else {
                        const response = JSON.parse(body);
                        if(response.status === false || statusCode !== 200) {
                            respHandler.sendError(res, 401, 'FAILURE', 'Error with payment gateway!', response);
                        } else {
                            Transaction.findByIdAndUpdate(transaction._id, {$set: {status: 'INITIATED', paystack_ref: response.data.reference}}, {new: true},
                                (errorTransaction, sucTransaction) => {
                                    if(errorTransaction || !sucTransaction) {
                                        // log error
                                        winston.logger.log('error', `Error while updating transaction - ${JSON.stringify(errorTransaction)} --- ---${JSON.stringify(transaction)}`);
                                        respHandler.sendError(res, 401, 'FAILURE', 'Error with update transaction!', errorTransaction);
                                    } else {
                                        respHandler.sendSuccess(res, 200, 'Transaction created successfully!', {
                                            // Proceed to pay with this URL
                                            authorization_url: response.data.authorization_url,
                                            details: {
                                                charge: charge,
                                                subTotal: subTotal,
                                                total: amountToPay,
                                                transactionId: transaction._id,
                                                full_name: user.full_name,
                                                email: user.email,
                                                ref: response.data.reference,
                                                access_code: response.data.access_code
                                            }
                                        });
                                    }
                                });
                        }
                    }
                });
            });
        }
    });
}
function transferToBankAccount(res, transaction) {
    Transaction.findByIdAndUpdate(transaction._id, {$set: {status: 'INITIATED'}}, {new: true},
        (errorTransaction, sucTransaction) => {
            if(errorTransaction) {
                // log error
                winston.logger.log('error', `Error: while updating transaction - ${JSON.stringify(errorTransaction)} --- ---${JSON.stringify(transaction)}--bank transfer`);
                respHandler.sendError(res, 401, 'FAILURE', 'Unable to complete checkout using bank transfer', errorTransaction);
            } else {
                // User to transfer to admin account and send proof of payment to admin
                respHandler.sendSuccess(res, 200, 'Transaction initiated with bank transfer, proceed to payment!', {
                    transactionRef: transaction.paymentReference,
                    transactionId: transaction._id,
                    amount: transaction.amount
                });
            }
        });
}
function initializePayment(data, cb) {
    const form = {
        email: data.email,
        amount: parseFloat(data.amount) * 100,
        full_name: data.full_name,
        first_name: data.first_name,
        last_name: data.last_name,
        callback_url: `${process.env.FRONT_END_URL}user/wallet-history/${data.transaction._id}`,
        metadata: {
            transactionId: data.transaction._id,
            full_name: data.full_name,
            first_name: data.first_name,
            last_name: data.last_name,
            orderReference: data.transaction.orderReference,
            total_price: data.transaction.total_price,
            payment_channel: data.transaction.payment_channel,
            userId: data.transaction.userId,
            narration: data.transaction.narration,

        }
    };
    const options = {
        url : 'https://api.paystack.co/transaction/initialize',
        headers : {
            authorization: `Bearer ${process.env.PAYSTACK_SKT}`,
            'content-type': 'application/json',
            'cache-control': 'no-cache'
        },
        form
    };
    console.log('OPTIONS ', options);
    const callback = (error, response, body)=>{
        // console.log('Error ', error, response);
        return cb(error, body, response.statusCode);
    };
    request.post(options, callback);
}

function verifyPayment(ref, cb) {
    const options = {
        url : 'https://api.paystack.co/transaction/verify/' + encodeURIComponent(ref),
        headers : {
            authorization: `Bearer ${process.env.PAYSTACK_SKT}`,
            'content-type': 'application/json',
            'cache-control': 'no-cache'
        }
    };
    const callback = (error, response, body) => {
        return cb(error, body, response.statusCode);
    };
    request.get(options, callback);
}