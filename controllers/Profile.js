const BankSetting = require('../models/BankSetting');
const respHandler = require('../services/responseHandler');
const validate = require('../services/validateService');
const paystackService = require('../services/paystackServices');

const ProfileController = {
    getBankInformation: (req, res) => {
        try {
            BankSetting.findOne({userId: req.params.userId}).exec((err, bankInfo) => {
                if (err || !bankInfo){
                    respHandler.sendError(res, 404, 'FAILURE', 'Unable to get bank information.', err);
                }
                if(validate.resultFound(bankInfo, res)) {
                    const data = validate.formatData(bankInfo);
                    respHandler.sendSuccess(res, 200, 'Bank information fetched successfully', data);
                }
            })
        } catch(err) {
            respHandler.sendError(res, 404, 'FAILURE', 'Unable to get bank setting.', err);
        }
    },
    createBankInformation: (req, res) => {
        try {
            if(!req.body.bank_code || !req.body.bank_name || !req.body.account_number) {
                respHandler.sendError(res, 400, 'FAILURE', 'Unable to create bank setting, bank code and name is required.', {});
            } else {
                BankSetting.create(req.body, (err, bankInfo) => {
                    if (err || !bankInfo){
                        respHandler.sendError(res, 404, 'FAILURE', 'Unable to create bank setting.', err);
                    } else {
                        paystackService.verifyBank(bankInfo, (msg, error) => {
                            respHandler.sendError(res, 401, 'FAILURE', msg, error);
                        }, (msg, data) => {
                            BankSetting.findOneAndUpdate({userId: req.params.userId}, {$set: {account_name: data.data.account_name, verified_account_name: data.data.account_name, verified: true}}, {new: true}, (e, updated) => {
                               if(!e){
                                   paystackService.transferRecipient(updated);
                               }
                            });
                            respHandler.sendSuccess(res, 200, msg || 'Bank info created successfully!', { bankInfo, data});
                        });
                    }
                });
            }
        } catch (err){
            respHandler.sendError(res, 400, 'FAILURE', 'Unable to create bank info');
        }
    },
    putBankInformation: (req, res) => {
        try {
            const { _id, userId, bank_name, bank_account, account_name, bvn, documents, bank_code, account_number } = req.body;
            if(_id) {
                if(!req.body.bank_name) {
                    respHandler.sendError(res, 400, 'FAILURE', 'Unable to update bank setting, bank code and name is required.', {});
                } else {
                    paystackService.listBanks((error, body, code) => {
                        if(error) {
                            respHandler.sendError(res, code, 'FAILURE', 'Unable to update bank information.', error);
                        } else {
                            const allBanks = JSON.parse(body);
                            const selectedBank = allBanks.data.filter((bank) => bank.name.toLowerCase() === req.body.bank_name.toLowerCase());
                            let code = null;
                            if(selectedBank[0]) {
                                 code = selectedBank[0].code
                            }
                            BankSetting.findOneAndUpdate({userId: req.params.userId}, {$set: {
                                userId, bank_name, bank_account, account_name, bvn, documents, bank_code: code, account_number }}, { new: true }, (err, bankInfo) => {
                                if (err || !bankInfo){
                                    respHandler.sendError(res, 404, 'FAILURE', 'Unable to update bank information.', err);
                                } else {
                                    paystackService.verifyBank(bankInfo, (msg, error) => {
                                        respHandler.sendError(res, 401, 'FAILURE', msg, error);
                                    }, (msg, data) => {
                                        BankSetting.findOneAndUpdate({userId: req.params.userId}, {$set: {account_name: data.data.account_name, verified_account_name: data.data.account_name, verified: true}}, {new: true}, (e, updated) => {
                                            if(!e){
                                                paystackService.transferRecipient(updated);
                                            }
                                        });
                                        respHandler.sendSuccess(res, 200, msg || 'Bank information updated successfully!', {bankInfo, data});
                                    });
                                }
                            });
                        }
                    });
                }
            } else {
                ProfileController.createBankInformation(req, res);
            }
        } catch (err){
            respHandler.sendError(res, 400, 'FAILURE', 'Unable to update bank info');
        }
    },
    getBanks: (req, res, next) => {
        paystackService.listBanks((error, body) => {
            const allBanks = JSON.parse(body);
            respHandler.sendSuccess(res, 200, 'Banks listed successfully!', allBanks || []);
        });

    }
};

module.exports = ProfileController;
