const Transaction = require('../models/Transaction');
const respHandler = require('../services/responseHandler');
const validate = require('../services/validateService');
const controllerService = require('../services/controllerServices');

const TransactionController = {
    getTransactions: async (req, res) => {
        try {
            const { page, limit } = req.query;
            let currentPage = parseInt(page, 10) || 1;
            const currentLimit = parseInt(limit, 10) || 9000;
            const totalCount = await Transaction.countDocuments({}).exec();
            Transaction.find({})
                .populate('userId', '-password')
                .sort('-createdAt')
                .exec((err, transaction) => {
                    if (err) {
                        respHandler.sendError(res, 400, 'FAILURE', 'Unable to list transactions.', err);
                    } else if (validate.resultFound(transaction, res)) {
                        const data = {
                            data: validate.formatData(transaction),
                            page: currentPage += 1,
                            limit: currentLimit,
                            total: totalCount
                        };
                        respHandler.sendSuccess(res, 200, 'Transactions listed successfully', data);
                    } else {
                        respHandler.sendError(res, 400, 'FAILURE', 'Unable to list transactions.', err);
                    }
                })
        } catch (err) {
            respHandler.sendError(res, 400, 'FAILURE', 'Unable to list transactions.', err);
        }
    },
    getPaystackTransactions: async (req, res) => {
        try {
            const { page, limit, status } = req.query;
            let currentPage = parseInt(page, 10) || 1;
            const currentLimit = parseInt(limit, 10) || 9000;


            let cond = {payment_channel: 'PAYSTACK'};
            if(status) {
                // in case there is a param to filter by status
                cond = {$and: [{payment_channel: 'PAYSTACK'}, {status}]};
            }
            const totalCount = await Transaction.countDocuments(cond).exec();
            Transaction.find(cond)
                .populate('userId', '-password')
                .sort("-createdAt")
                .exec((err, transaction) => {
                    if (err) {
                        respHandler.sendError(res, 400, 'FAILURE', 'Unable to list paystack transactions.', err);
                    } else if (validate.resultFound(transaction, res)) {
                        const data = {
                            data: validate.formatData(transaction),
                            page: currentPage += 1,
                            limit: currentLimit,
                            total: totalCount
                        };
                        respHandler.sendSuccess(res, 200, 'Paystack transactions listed successfully', data);
                    } else {
                        respHandler.sendError(res, 400, 'FAILURE', 'Unable to list paystack transactions.', err);
                    }
                })


        } catch (err) {
            respHandler.sendError(res, 400, 'FAILURE', 'Unable to list transactions.', err);
        }
    },

    getBankTransactions: async (req, res) => {
        try {
            const { page, limit } = req.query;
            let currentPage = parseInt(page, 10) || 1;
            const currentLimit = parseInt(limit, 10) || 9000;


            let cond = {payment_channel: 'BANK_TRANSFER'};
            if(status) {
                // in case there is a param to filter by status
                cond = {$and: [{payment_channel: 'BANK_TRANSFER'}, {status}]};
            }
            const totalCount = await Transaction.countDocuments(cond).exec();
            Transaction.find(cond)
                .populate('userId', '-password')
                .sort("-createdAt")
                .exec((err, transaction) => {
                    if (err) {
                        respHandler.sendError(res, 400, 'FAILURE', 'Unable to list bank transfer transactions.', err);
                    } else if (validate.resultFound(transaction, res)) {
                        const data = {
                            data: validate.formatData(transaction),
                            page: currentPage += 1,
                            limit: currentLimit,
                            total: totalCount
                        };
                        respHandler.sendSuccess(res, 200, 'Bank transfer transactions listed successfully', data);
                    } else {
                        respHandler.sendError(res, 400, 'FAILURE', 'Unable to list bank transfer transactions.', err);
                    }
                });


        } catch (err) {
            respHandler.sendError(res, 400, 'FAILURE', 'Unable to list transactions.', err);
        }
    },
    getUserTransactions: (req, res) => {
        try {
            Transaction.find({$and: [{userId: req.params.userId}, {status: 'CONFIRMED'}]})
                .sort("-createdAt")
                .exec((err, transactions) => {
                    if (err){
                        respHandler.sendError(res, 404, 'FAILURE', 'Unable to get user\'s transactions.', err);
                    } else if (validate.resultFound(transactions, res)) {
                        const data = validate.formatData(transactions);
                        respHandler.sendSuccess(res, 200, 'User\'s transactions fetched successfully', data);
                    } else {
                        respHandler.sendError(res, 400, 'FAILURE', 'Unable to list transactions.', err);
                    }
                })
        } catch(err) {
            respHandler.sendError(res, 404, 'FAILURE', 'Unable to get transactions.', err);
        }
    },

    searchTransaction: async (req, res) => {
        try {
            const { narration, paymentReference, status, total_price } = req.body;
            const { page, limit } = req.query;
            let currentPage = parseInt(page, 10) || 1;
            const currentLimit = parseInt(limit, 10) || 9000;
            const totalCount = await Transaction.countDocuments({$or: [{narration: new RegExp(`^${narration}.*`, "i")},
                {paymentReference}, {status}, {total_price}]}).exec();

            Transaction.find({$or: [{narration: new RegExp(`^${narration}.*`, "i")},
                {paymentReference}, {status}, {total_price}]})
                .populate('userId', '-password')
                .skip((currentLimit * currentPage) - currentLimit)
                .sort("-createdAt")
                .limit(currentLimit)
                .exec((err, transaction) => {
                    if (err || !transaction.length){
                        respHandler.sendError(res, 404, 'FAILURE', 'No transaction matches that criteria!', err);
                    } else if (validate.resultFound(transaction, res)) {
                        const data = {
                            data: validate.formatData(transaction),
                            page: currentPage += 1,
                            limit: currentLimit,
                            total: totalCount
                        };
                        respHandler.sendSuccess(res, 200, 'Transactions retrieved successfully', data);
                    }
                })
        } catch(err) {
            respHandler.sendError(res, 404, 'FAILURE', 'Unable to search transaction.', err);
        }
    },
    filterTransaction: async (req, res) => {
        try {
            const { page, limit } = req.query;
            let currentPage = parseInt(page, 10) || 1;
            const currentLimit = parseInt(limit, 10) || 9000;
            const transactionQuery = getSearchQuery(req);
            transactionQuery
                .populate('userId', '-password')
                .skip((currentPage - 1) * currentLimit)
                .limit(currentLimit)
                .sort("-createdAt")
                .exec((err, transaction) => {
                    if (err || !transaction.length){
                        respHandler.sendError(res, 404, 'FAILURE', 'No transactions matches filter criteria!', err);
                    } else if (validate.resultFound(transaction, res)) {
                        const data = {
                            data: validate.formatData(transaction),
                            page: currentPage += 1,
                            limit: currentLimit
                        };
                        respHandler.sendSuccess(res, 200, 'Transaction filtered successfully', data);
                    }
                })
        } catch(err) {
            console.log('error ', err);
            respHandler.sendError(res, 404, 'FAILURE', 'Unable to filter transaction.', err);
        }
    },
    getTransaction: (req, res) => {
        try {
            Transaction.findById(req.params.id)
                .populate('userId', '-password')
                .exec((err, transaction) => {
                    if (err || !transaction){
                        respHandler.sendError(res, 404, 'FAILURE', 'Unable to get transaction by id.', err);
                    } else if (validate.resultFound(transaction, res)) {
                        const data = validate.formatData(transaction);
                        respHandler.sendSuccess(res, 200, 'Transaction fetched successfully', data);
                    }
                })
        } catch(err) {
            respHandler.sendError(res, 404, 'FAILURE', 'Unable to get transaction.', err);
        }
    },
    getTransactionByRef: (req, res) => {
        try {
            Transaction.findOne({paymentReference: req.params.ref})
                .populate('userId', '-password')
                .sort("-createdAt")
                .exec((err, transaction) => {
                    if (err || !transaction){
                        respHandler.sendError(res, 404, 'FAILURE', 'Unable to get transaction by payment reference.', err);
                    } else if (validate.resultFound(transaction, res)) {
                        const data = validate.formatData(transaction);
                        respHandler.sendSuccess(res, 200, 'Transaction fetched successfully', data);
                    }
                })
        } catch(err) {
            console.log('error ', err);
            respHandler.sendError(res, 404, 'FAILURE', 'Unable to get transaction.', err);
        }
    },

    /**
     * Allowed to update narration and status by Admin only
     * @param req
     * @param res
     */
    putTransaction: (req, res) => {
        try {
            const {narration, status} = req.body;
            Transaction.findByIdAndUpdate(req.params.id, {$set: {narration, status}}, { new: true }, (err, transaction) => {
                if (err || !transaction){
                    respHandler.sendError(res, 404, 'FAILURE', 'Unable to update transaction(Narration, Status).', err);
                } else {
                    respHandler.sendSuccess(res, 200, 'Transaction updated successfully(Narration, Status)!', transaction);
                }
            });
        } catch (err){
            respHandler.sendError(res, 400, 'FAILURE', 'Unable to update transaction');
        }
    },
    deleteTransaction: (req, res) => {
        try {
            controllerService.getLoginUser(req, 'userId', (deletedBy) => {
                Transaction.delete({_id: req.params.id}, deletedBy, (err) => {
                    if (err){
                        return respHandler.sendError(res, 404, 'FAILURE', 'Unable to delete transaction.', err);
                    }
                    respHandler.sendSuccess(res, 200, 'Transaction soft deleted by id successfully!', {});
                });
            });

        } catch (err) {
            respHandler.sendError(res, 400, 'FAILURE', 'Unable to delete transaction by id');
        }
    },
};

module.exports = TransactionController;

function getSearchQuery(req) {
    const { narration, status } = req.body;
    const query = Transaction.find({});
    const queryTerm = [ ];

    if (narration) {
        queryTerm.push({ narration: new RegExp(`^${narration}.*`, "i") });
    }
    if (status) {
        queryTerm.push({ status: status });
    }

    if (queryTerm.length > 0) {
        query.select();
        query.or(queryTerm);
    } else {
        query.select()
    }

    return query;



}