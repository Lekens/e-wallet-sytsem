const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const mongoose_delete = require('mongoose-delete');

const bankSettingSchema = new Schema({
    bank_name: {
        type: String
    },
    bank_code: {
        type: String
    },
    account_number: {
        type: String,
        required: true
    },
    account_name: {
        type: String
    },
    transfer_recipient: {
        type: String
    },
    verified_account_name: {
        type: String
    },
    bvn: {
        type: String,
        // required: true
    },
    verified: {
        type: Boolean,
        default: false
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});


bankSettingSchema.plugin(mongoose_delete, { deletedAt : true, deletedBy : true, overrideMethods: true });
bankSettingSchema.index({ userId: 1 }, { unique: true });

const BankSetting = mongoose.model('BankInformation', bankSettingSchema);
// make this available to our Node applications
module.exports = BankSetting;
