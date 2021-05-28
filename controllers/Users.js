const Users = require('../models/Users');
const respHandler = require('../services/responseHandler');
const validate = require('../services/validateService');
const controllerService = require('../services/controllerServices');
const moment = require('moment');
const nanoid = require('nanoid');


const UsersController = {
    getUsers: async (req, res) => {
        try {
            const { page, limit, role } = req.query;
            let currentPage = parseInt(page, 10) || 1;
            const currentLimit = parseInt(limit, 10) || 9050;

            // Decide to filter by viewer role
            let cond = {};
            if(role === 'USER') {
                cond = {role: role.toUpperCase()}
            } else if(role === 'SUPER') {
                cond = {role: {$ne: 'USER'}}
            } else {
                cond = {};
            }
            const totalCount = await Users.countDocuments(cond).exec();
            Users.find(cond, '-password')
                .skip((currentLimit * currentPage) - currentLimit)
                .limit(currentLimit)
                .exec((err, users) => {
                if (err) {
                    respHandler.sendError(res, 400, 'FAILURE', 'Unable to list users.', err);
                }
                // console.log('Users ', users);
                if (validate.resultFound(users, res)) {
                    const data = {
                        data: validate.formatData(users),
                        page: currentPage += 1,
                        limit: currentLimit,
                        total: totalCount
                    };
                    respHandler.sendSuccess(res, 200, 'Users listed successfully', data);
                }
            })
        } catch (err) {
            respHandler.sendError(res, 400, 'FAILURE', 'Unable to list users.', err);
        }
    },
    getUser: (req, res) => {
        try {
            Users.findById(req.params.id, '-password').exec((err, user) => {
                if (err || !user){
                    respHandler.sendError(res, 404, 'FAILURE', 'Unable to get user.', err);
                }
                if(validate.resultFound(user, res)) {
                    const data = validate.formatData(user);
                    respHandler.sendSuccess(res, 200, 'User fetched successfully', data);
                }
            })
        } catch(err) {
            respHandler.sendError(res, 404, 'FAILURE', 'Unable to get user.', err);
        }
    },
    // For now allow users to change role for CheckDC Testers
    putUser: (req, res) => {
        try {
            const user = req.body;
            // Prevent password update
            if (user.password) {
                user.password = null;
                delete user.password
            }
            Users.findByIdAndUpdate(req.params.id, {$set: user}, { new: true }, (err, updatedUser) => {
                if (err || !updatedUser){
                    respHandler.sendError(res, 404, 'FAILURE', 'Unable to update user.', err);
                }
                if(updatedUser) {
                    updatedUser.password = null;
                    respHandler.sendSuccess(res, 200, 'User updated successfully!', updatedUser);
                }
            });
        } catch (err){
            respHandler.sendError(res, 400, 'FAILURE', 'Unable to update user');
        }
    },
    deleteUser: (req, res) => {
        try {
             controllerService.getLoginUser(req, 'userId', (deletedBy) => {
                Users.delete({_id: req.params.id}, deletedBy, (err, user) => {
                    if (err){
                        respHandler.sendError(res, 404, 'FAILURE', 'Unable to delete user.', err);
                    }
                    // User should be kept silent and allow them to reuse the email.
                    Users.findByIdAndUpdate(req.params.id, {$set: {email: user.email + '__' + moment.now() + '_' + nanoid(3)}}, {new: true}, () => {
                        respHandler.sendSuccess(res, 200, 'User deleted successfully!', {});
                    });
                });
            });

        } catch (err) {
            respHandler.sendError(res, 400, 'FAILURE', 'Unable to delete user');
        }
    },
};

module.exports = UsersController;
