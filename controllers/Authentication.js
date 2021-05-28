const Users = require('../models/Users');
const respHandler = require('../services/responseHandler');
const validate = require('../services/validateService');
const bcrypt = require('bcrypt');
const Tokens = require('../models/Tokens');
const Wallet = require('../models/Wallet');
const nanoid = require('nanoid');
const jwtService = require('../services/jwtService');

const AuthenticationController = {
    returnMessage: (req, res) => {
        respHandler.sendSuccess(res, 200, 'Please specify the endpoint!', {});
    },
    login: (req, res, next) => {
        try {
            const {email, password} = req.body;
            let query =  Users.findOne({email: email});
            query.exec((err, user) => {
                if (err || !user){
                    return respHandler.sendError(res, 400, 'FAILURE', 'User not found on the server');
                } else if(user && !user.is_verified) {
                    respHandler.sendError(res, 401, 'USER_NOT_VERIFIED', 'User account not verified yet!');
                } else if(user){
                    bcrypt.compare(password, user.password, (error, response) => {
                        if(!response) {
                            respHandler.sendError(res, 401, 'FAILURE', 'Incorrect user password!', error);
                        } else {
                            // Password check is successful
                            const jsonUser = user.toJSON();
                            // Retrieve the user wallet value, after login
                            let wallet = 0.0;
                            Wallet.findOne({userId: user._id}, (walletError, walletSuccess) => {
                                if(walletError || !walletSuccess) {
                                    wallet = 0.0;
                                } else {
                                    wallet = walletSuccess.wallet_balance || 0.0;
                                }
                                jsonUser.wallet_balance = wallet;

                                // delete the password after using it to compare
                                delete jsonUser.password;
                                proceedToGenerateToken(jsonUser, req, res, next);
                            });
                        }
                    });
                } else {
                    respHandler.sendError(res, 400, 'FAILURE', 'Unable to authenticate user!');
                }
            });
        } catch (error) {
            respHandler.sendError(res, 400, 'FAILURE', 'Error while authenticating user.');
        }
    },
    logout: (req, res) => {
        const logout = req.headers.authorization || {};
        const user = jwtService.jwt.decodeJWT(logout);
        user.then((result) => {
            logoutUser(res, result.data);
        }).catch((e) => {
            respHandler.sendError(res, 400, 'FAILURE', 'Unable to log user out', e);
        })
    },
    register: (req, res) => {
        try {
            const userObject = req.body;
            if(userObject && !validate.isEmptyObject(userObject)){
                if(!userObject.first_name) {
                    respHandler.sendError(res, 406, 'FAILURE', 'User firstname is required');
                } else if(!userObject.last_name) {
                    respHandler.sendError(res, 406, 'FAILURE', 'User lastname is required');
                } else if(!userObject.password) {
                    respHandler.sendError(res, 406, 'FAILURE', 'No password provided!');
                } else if(!userObject.email) {
                    respHandler.sendError(res, 406, 'FAILURE', 'Provide user email!');
                } else {
                    bcrypt.hash(userObject.password, 10,  (err, hash) => {
                        userObject.password = hash;
                        Users.create(userObject, (err, user) => {
                            if (err) {
                                switch (err.name) {
                                    case 'ValidationError': {
                                        if (err.message.includes('`email` to be unique')){
                                            respHandler.sendError(res, 406, 'FAILURE', 'Email already exist!');
                                        } else if(err.message.includes('`email` is invalid')) {
                                            respHandler.sendError(res, 401, 'FAILURE', 'Invalid email address!');
                                        } else {
                                            respHandler.sendError(res, 401, 'FAILURE', err.message, err);
                                        }
                                        break;
                                    }
                                    default: {
                                        respHandler.sendError(res, 400, 'FAILURE', err.message, err);
                                        break;
                                    }
                                }
                            }
                            else if(validate.resultFound(user, res)) {
                                const data = validate.formatData(user);
                                // Create wallet for this user
                                Wallet.create({userId: user._id}, () => {
                                    // Todo: You can send a sign up mail here if you have one setup
                                    respHandler.sendSuccess(res, 200, 'Registration successful', data);
                                });
                            }
                        });
                    });
                }
            } else {
                respHandler.sendError(res, 400, 'FAILURE', 'Provide user details');
            }

        } catch (err){
            respHandler.sendError(res, 400, 'FAILURE', 'Unable to register user');
        }
    }

};

module.exports = AuthenticationController;


function proceedToGenerateToken(user, req, res, next) {
    // get JWT implementation here
    try {
        // Wallet system requires some level of security
        const generatedKey = nanoid() + '___-___' + nanoid(); // random string to be save to db as auth procedure
        const secretToken = {
            token: generatedKey,
            role: user.role,
            userId: user._id
        };
        Tokens.create(secretToken, (err, token) => {
            if (err || !token) {
                respHandler.sendError(res, 400, 'FAILURE', 'User authentication failed, please retry!');
            } else {
                generateJWT(user, generatedKey, res);
            }
        });

    } catch (error) {
        respHandler.sendError(res, 401, 'FAILURE', 'User authentication failed, please retry!');
    }

}


function generateJWT(user, secret, res) {
    try {
        user.secretToken = secret;
        const genToken = jwtService.jwt.signEncryptJWT(user);
        genToken.then((result) => {
            respHandler.sendSuccess(res, 200, 'User authentication successful', {token: result, user: user});
        })
    } catch (error) {
        respHandler.sendError(res, 401, 'FAILURE', 'User authentication failed, please retry!');
    }
}



function logoutUser(res, logout) {
    try {
        Tokens.deleteMany( {$or: [{token: logout.secretToken}, {userId: logout.userId}]}, {multi: true}, (err, token) => {
            if(token) {
                respHandler.sendSuccess(res, 200, 'User logout successful', token);
            } else {
                respHandler.sendSuccess(res, 200, 'User logout successful with error 0', token);
            }
        });
    } catch (err){
        respHandler.sendError(res, 400, 'FAILURE', 'Unable to log user out');
    }
    finally {
        // Background check
        // DELETE ALL EXPIRED TOKENS IN THE SYSTEM
        Tokens.find({}, function (err, tokens) {
            if(tokens) {
                tokens.forEach((token) => {
                    if(new Date(token.lastUsed) > new Date(token.expiredIn)) {
                        Tokens.findByIdAndRemove(token._id, () => {
                            console.log('Removed expired tokens');
                        });
                    }
                });
            }
        });
    }
}