const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const moment = require('moment');

// create a token schema
const tokenSchema = new Schema({
    token: {
        type: String,
        required: true
    },
    role: {
      type: String,
        enum: ['USER', 'ADMIN'],
        required: true
    },
    userId: {
        type:  mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastUsed: {
        type: Date,
        default: moment(Date.now())
    },
    expiredIn: {
        type: Date,
        default:  moment(Date.now()).add(9, 'hours')// add expiring date time
    },
    expired: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

tokenSchema.pre('save', function (next){
    if((moment(this.lastUsed)).isSameOrAfter(moment(this.expiredIn))){
        this.lastUsed = moment(Date.now());
    } else {
        this.lastUsed = moment(Date.now());
        this.expiredIn = moment(Date.now()).add(90, 'hours');
    }
    next();
});
const Tokens = mongoose.model('Token', tokenSchema);
tokenSchema.index({ token: 1, userId: 1 }, { unique: true });

// make this available to our Node applications
module.exports = Tokens;
