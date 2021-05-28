const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const mongoose_delete = require('mongoose-delete');

const withdrawalHistorySchema = new Schema({
    narration: {
        type: String,
        required: true
    },
    userId: {
        type:  mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount_withdrawn: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});


withdrawalHistorySchema.plugin(mongoose_delete, { deletedAt : true, deletedBy : true, overrideMethods: true });

const WithdrawalHistory = mongoose.model('WithdrawalHistory', withdrawalHistorySchema);
// make this available to our Node applications
module.exports = WithdrawalHistory;
