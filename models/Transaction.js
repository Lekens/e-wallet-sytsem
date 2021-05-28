const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const uniqueValidator = require('mongoose-unique-validator');
const mongoose_delete = require('mongoose-delete');

const transactionSchema = new Schema({
    userId: {
        type:  mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    narration: {
        type: String,
        required: true
    },
    payment_channel: {
        type:  String,
        enum: ['PAYSTACK', 'BANK_TRANSFER'],
        required: true
    },
    old_wallet_balance: {
        type: Number
    },
    new_wallet_balance: {
        type: Number
    },
    amount: {
        type: Number
    },
    type: {
        type: String,
        enum: ['DEBIT', 'CREDIT']
    },
    paymentReference: {
        type: String
    },
    paystack_ref: {
        type: String
    },
    paystack_status: {
        type: String
    },
    status: {
        type: String,
        enum: ['CREATED', 'INITIATED', 'ON_HOLD', 'CONFIRMED', 'REJECTED', 'FAILED', 'CANCELED', 'COMPLETED'],
        default: 'CREATED'
    }
}, {
    timestamps: true
});


transactionSchema.plugin(mongoose_delete, { deletedAt : true, deletedBy : true, overrideMethods: true });

transactionSchema.plugin(uniqueValidator);

const Transaction = mongoose.model('Transaction', transactionSchema);

// make this available to our Node applications
module.exports = Transaction;
