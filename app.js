const express = require('express');
const dotenv = require('dotenv').config();
const logger = require('morgan');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const winston = require('./config/winston');
const rateLimit = require("express-rate-limit");

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

// Start Express Application
const app = express();

// Set up Logger system
if (dotenv.error) {
    winston.logger.log('error', `Error with dotenv`);
    throw dotenv.error;
} else {
    /**
     * Connection begins
     */
    const dbName = process.env.NODE_ENV === 'development' ? process.env.DB_NAME_DEV : process.env.DB_NAME_PROD;
    const connectionString = process.env.CONNECTION_STRING;
    mongoose.set('useFindAndModify', false);
    mongoose.set("useCreateIndex", true);
    mongoose.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'Connection error, unable to connect to database!'));
    db.once('open', () => {
        // connected
    winston.logger.log('info', `Connected correctly to server => ${dbName}`);
});
// Connection ends here.

}

// Set up routes
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const transactionRouter = require('./routes/transaction');
const walletRouter = require('./routes/wallet');
const profileRouter = require('./routes/profile');

// set up environment
app.use(logger('dev'));
app.use(logger("combined", { stream: winston.Winston.stream }));
app.use(express.json());

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.urlencoded({ extended: false }));

app.use(bodyParser.json({limit: "90mb"}));
app.use(bodyParser.urlencoded({limit: "90mb", extended: true, parameterLimit:90000}));


// Set up api limit per minutes
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 150 // limit each IP to 150 requests per windowMs
});

//  apply to all requests
app.use(limiter);


app.use( (req, res, next) => {
    // Allow access from all origin for now
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, PATCH, DELETE, OPTIONS');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Cache-Control', 'max-age=0, no-cache, must-revalidate, proxy-revalidate, private');
    res.set("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1.
    res.set("Pragma", "no-cache");
    next();
});

// Assign routers
app.use(`${process.env.BASE_URL}${process.env.VERSION}/swagger-documentation`, swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(`${process.env.BASE_URL}${process.env.VERSION}/`, indexRouter);
app.use(`${process.env.BASE_URL}${process.env.VERSION}/auth`, authRouter);
app.use(`${process.env.BASE_URL}${process.env.VERSION}/users`, usersRouter);
app.use(`${process.env.BASE_URL}${process.env.VERSION}/transactions`, transactionRouter);
app.use(`${process.env.BASE_URL}${process.env.VERSION}/wallet`, walletRouter);
app.use(`${process.env.BASE_URL}${process.env.VERSION}/profile`, profileRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
    const msg = 'This resources you are trying to access is not found on this server!.';
const err = new Error(msg);
err.status = 'FAILURE';
err.code = 404;
err.msg = msg;
res.status(404).send(err);
});

// error handler
app.use((err, req, res, next) => {
    const error = new Error('Internal server error');
// set locals, only providing error in development
res.locals.message = err.message;
res.locals.error = req.app.get('env') === 'development' ? err : {};
res.status(err.status || 500).send(error + err);
});

module.exports = app;
