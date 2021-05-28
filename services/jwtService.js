
Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const jwtEncrypt = require('jwt-token-encrypt');
const _encrypt2 = _interopRequireDefault(jwtEncrypt);
exports.jwt = {
    signEncryptJWT: (data) => {
      let privateData , publicData = {};
        publicData = {
            role: data.role,
            full_name: data.full_name,
            userId: data._id,
            email: data.email
        };
        // Data that will only be available to users who know encryption details.
        privateData = data;


// Encryption settings
        const encryption = {
            key: process.env.SECRET_KEY_TOKEN,
            algorithm: 'aes-256-cbc',
        };

// JWT Settings
        const jwtDetails = {
            secret: process.env.SECRET_KEY, // to sign the token
            // Default values that will be automatically applied unless specified.
            // algorithm: 'HS256',
            expiresIn: '90h',
            // notBefore: '0s',
            // Other optional values
            key: process.env.SECRETENTITY,// is used as ISS but can be named iss too
        };
        return new Promise((resolve, reject) => {
            const token =  _encrypt2.default.generateJWT(
                jwtDetails,
                publicData,
                encryption,
                privateData,
                'session'
            );
            if(token){
                resolve(token);
            } else {
                reject('Error');
            }
        });
    },
    decodeJWT: async (token) => {
        // Encryption settings
        const encryption = {
            key: process.env.SECRET_KEY_TOKEN,
            algorithm: 'aes-256-cbc',
        };
        try {
            // console.info('HELLO WORLD');
            return new Promise((resolve, reject) => {
                // console.info('HELLO WORLD 45678');
                const decrypted = _encrypt2.default.readJWT(token, encryption, 'session');
                // console.info('DECRYPED ', decrypted);
                if(decrypted) {
                    resolve(decrypted);
                } else {
                    reject('Error');
                }
            });
        } catch (Error) {
            // console.info('Error occured ', Error);
        }
    }
};
