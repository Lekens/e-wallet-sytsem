// const dotenv = require('dotenv').config();
const appRoot = require('app-root-path');
const winston = require('winston');


const options = {
    file: {
        level: process.env.NODE_ENV === "development" ? "debug" : "info",
        filename: `${appRoot}/logs/${process.env.NODE_ENV}.log`,
        handleExceptions: true,
        json: true,
        maxsize: 1024000000, // 1GB
        maxFiles: 1024,
        colorize: false
    },
    console: {
        level: "debug",
        handleExceptions: true,
        json: false,
        colorize: true
    }
};
const logger = winston.createLogger({
    transports: [
        new winston.transports.Console(options.console),
        new winston.transports.File(options.file)
    ],
    exitOnError: false // do not exit on handled exceptions
});
exports.logger = logger;
exports.Winston = {
    stream: {
        write(message, _encoding) {
            // use the 'info' log level so the output will be picked up by both transports (file and console)
            logger.info(message);
        }
    }
};


