const Tokens = require('../models/Tokens');
const moment = require('moment');
const jwtService = require('../services/jwtService');

const controllerServices = {
    checkAuthorizationToken: (req, res, next, role=['USER', 'ADMIN']) => {
            if (req.headers && req.headers.authorization) {
                const authorization = req.headers.authorization;
                try {
                    const decoded = jwtService.jwt.decodeJWT(authorization).catch((e) => {
                        sendError(res, 401, 'FAILURE', 'Faulty Token :___: ' + e.message );
                    });
                    decoded.then((result) => {
                        if(result){
                            const decodedUser = result.data;
                            Tokens.findOne({$and: [{token: decodedUser.secretToken}, {userId: decodedUser.userId}]}, (err, tokenSet) => {
                                if(!tokenSet) {
                                    sendError(res, 401, 'FAILURE', 'Authorization failed, token is not valid or has expired');
                                } else {
                                    if (tokenSet.expired === true) {
                                        deleteTheToken(decodedUser, tokenSet._id, res);
                                    } else if(tokenSet && moment(Date.now()).isAfter(moment(tokenSet.expiredIn))) {
                                        deleteTheToken(decodedUser, tokenSet._id, res);
                                    } else {
                                        if((role.constructor.name === 'Array' && role.includes(tokenSet.role)) || (role.constructor.name === 'String' && role === tokenSet.role)){
                                            updateSecretToken(tokenSet._id, next)
                                        } else {
                                            sendError(res, 401, 'FAILURE', 'Authorization failed, only admin can perform this action.');
                                        }
                                    }
                                }
                            });
                            return false;
                        } else {
                            sendError(res, 401, 'FAILURE', 'Unable to authorize user.');
                        }
                    });
                } catch (e) {
                    sendError(res, 401, 'FAILURE', 'User not authorized to perform action.');
                }
            } else {
                sendError(res, 401, 'FAILURE', 'Authorization failed, token not provided');
            }
    },
    getLoginUser: (req, key, cb = null) => {
        const auth = req.headers.authorization;
        let user;
        if(auth) {
            user = jwtService.jwt.decodeJWT(auth);
            user.then((result) => {
                // console.log('result.data ', result.data);
                if(cb) {
                    cb(result.data[key]);
                } else {
                    return result.data[key];
                }
            }).catch(() => {
                if(cb) {
                    cb({});
                } else {
                    return {};
                }
            })
        }
    },
    getRandomInt: (max) => {
        return Math.floor(Math.random() * Math.floor(max));
    },
    calculateTransactionCharge: (amount, cb) => {
        let amountToPay = parseFloat(amount);
        let amountCap = 2500;
        let charge = 0;
        let flatFee = 0.0;
        let decimalFee = (1.5 / 100);
        if(amountToPay >= amountCap) {
            flatFee = 100;
        }
        let finalAmount = +((amountToPay + flatFee) / (1 -  decimalFee)).toFixed(2);

        charge  = +(finalAmount - amountToPay).toFixed(2);
        if(charge > 2000) {
            charge = 2000;
            finalAmount = amountToPay + charge;
        }
        cb(charge, amountToPay, finalAmount);
    },
};
module.exports = controllerServices;

function deleteTheToken(decodedUser, token, res) {
    Tokens.findOneAndRemove({$or: [{_id: token},{userId: decodedUser.userId}]}, () => {
        sendError(res, 401, 'FAILURE', 'Token timeout');
    });
}

function updateSecretToken(token, next) {
// set either expired or lastUsed
    const addHours =  moment(Date.now()).add(9, 'hours');
    Tokens.findByIdAndUpdate({_id: token}, {$set: {lastUsed: Date.now(), expiredIn: addHours, expired: false}}, {new: true},
        () => {
            next();
        });
}


function sendError (res, code, status, message, error){
    const err = new Error(message);
    err.status = status;
    err.code = code;
    err.msg = message;
    (error) ? err.ERROR = error : '';
    res.status(code).send(err);
}
