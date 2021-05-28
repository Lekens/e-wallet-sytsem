const express = require('express');
const bodyParser = require('body-parser');
const authentication = require('../controllers/Authentication');
const authRouter = express.Router();
authRouter.use(bodyParser.json());

authRouter.route('/')
    .all((req, res, next) => authentication.returnMessage(req, res, next));
authRouter.route('/login')
    .post((req, res, next) => authentication.login(req, res, next) );
authRouter.route('/logout')
    .post((req, res, next) => authentication.logout(req, res));
authRouter.route('/register')
    .post((req, res, next) => authentication.register(req, res));

module.exports = authRouter;


// User Control System
