const request = require('request');
// const WithdrawalRequest = require('../models/WithdrawalRequest');
const winston = require('../config/winston');
const BankSetting = require('../models/BankSetting');
const respHandler = require('../services/responseHandler');

const paystackServices = {
    verifyBank:  (data, err, success) => {
        console.log('DATA ', data);
        const options = {
            url : `https://api.paystack.co/bank/resolve?account_number=${data.account_number}&bank_code=${data.bank_code}`,
            headers : {
                authorization: `Bearer ${process.env.PAYSTACK_SKT}`,
                'content-type': 'application/json'
            }
        };
        const callback = (error, response, body)=> {
            if(error) {
                return err('Unable to validate Account details', error)
            } else {
                console.log('body ', body, response.statusCode);
                if(response && response.statusCode !== 200) {
                    return err('Unable to validate Account details', response.body);
                } else {
                    const resData = JSON.parse(response.body);
                    return success(resData.message, resData);
                }
            }
        };
        request.get(options, callback);
    },
    transferRecipient:  (data, cb=null, res=null) => {
        console.log('DATA ', data);
        const form = {
            type: "nuban",
            name: data.account_name,
            account_number: data.account_number,
            bank_code: data.bank_code,
            currency: "NGN"
        };
        const options = {
            url : `https://api.paystack.co/transferrecipient`,
            headers : {
                authorization: `Bearer ${process.env.PAYSTACK_SKT}`,
                'content-type': 'application/json',
                'cache-control': 'no-cache'
            }, form
        };
        const callback = (error, response, body)=> {
            if(error && res) {
                respHandler.sendError(res, 400, 'FAILURE', 'Incomplete bank account details, set bank details on profile!', {});
            } else {
                const resData = JSON.parse(response.body);
                if(resData && resData.status && resData.data.recipient_code) {
                    BankSetting.findOneAndUpdate({userId: data.userId}, {$set: {transfer_recipient: resData.data.recipient_code}}, {new: true}, () => {
                        if(cb) {cb();}
                        winston.logger.log('info', `Trying to confirm transfer recipient ${error}, ${response}`);
                    });
                } else {
                    winston.logger.log('error', `Unable to update transfer recipient ${error}, ${response}`);
                }

            }

        };
        request.post(options, callback);
    },
    checkTransferRecipient: (res, userBank, cb) => {
        BankSetting.findOne({userId: userBank.userId}, (error, bankSetting) => {
            if(error || !bankSetting) {
                respHandler.sendError(res, 400, 'FAILURE', 'Incomplete bank account details, set bank details on profile!', {});
            } else {
                if(bankSetting && bankSetting.transfer_recipient) {
                    cb();
                } else {
                    paystackServices.transferRecipient(bankSetting, cb);
                }
            }
        });
    },
    listBanks(cb) {
    const options = {
        url : 'https://api.paystack.co/bank',
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
    },
    transferMoneyToBankAccount: (data, errorCb, cb) => {
        console.log('DATA ', data);
        const form = {
            source: "balance",
            amount: data.amount,
            recipient: data.transfer_recipient,
            reason: data.narration
        };
        const options = {
            url : `https://api.paystack.co/transfer`,
            headers : {
                authorization: `Bearer ${process.env.PAYSTACK_SKT}`,
                'content-type': 'application/json',
                'cache-control': 'no-cache'

            }, form
        };
        const callback = (error, response, body)=> {
            console.log('PAY to Bank ', error, body, response.statusCode);
            const responseData = JSON.parse(body);
            if(response && response.statusCode < 205 && responseData.status) {
                /*WithdrawalRequest.findByIdAndUpdate(data.withdrawalRequest, {$set: {
                    paystackReference: responseData.data.reference,
                    paystack: response.data, paymentStatus: responseData.data.status.toUpperCase()
                }}, {new: true}, () => {
                   cb(responseData.message, {responseData, response});
                });*/
            } else {
                errorCb({error, response})
            }
        };
        request.post(options, callback);
    }
};
module.exports = paystackServices;

