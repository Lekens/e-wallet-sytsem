const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const uniqueValidator = require('mongoose-unique-validator');
const mongoose_delete = require('mongoose-delete');

const walletSchema = new Schema({
    userId: {
        type:  mongoose.Schema.Types.ObjectId,
        ref: 'User',
        unique: true,
        required: true
    },
    wallet_balance: {
        type: Number,
        default: 0.0
    },
    last_fund_date: {
        type: String,
        default: 'nil'
    },
    is_active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});


walletSchema.plugin(mongoose_delete, { deletedAt : true, deletedBy : true, overrideMethods: true });

walletSchema.plugin(uniqueValidator);
const Wallet = mongoose.model('Wallet', walletSchema);
// make this available to our Node applications
module.exports = Wallet;
