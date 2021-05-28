const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const Schema = mongoose.Schema;
const mongoose_delete = require('mongoose-delete');

// create a user schema
const userSchema = new Schema({
    first_name: {
        type: String,
        required: true
    },
    last_name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        uniqueCaseInsensitive: true,
        dropDups: true,
        trim: true,
        lowercase: true,
        match: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/
    },
    is_verified: {
        type: Boolean,
        default: true // since no email service for now
    },
    role: {
        type: String,
        enum: ['USER', 'ADMIN'],
        default: 'USER'
    },
    password: {
        type: String
    },
}, {
    toObject: {
        virtuals: true
    },
    toJSON: {
        virtuals: true
    }
}, {
    timestamps: true
});

userSchema.plugin(mongoose_delete, { deletedAt : true, deletedBy : true, overrideMethods: true });

userSchema.plugin(uniqueValidator);

userSchema
    .virtual("full_name")
    .get(function() {
        return `${this.first_name} ${this.last_name}`;
    });

const Users = mongoose.model('User', userSchema);

// make this available to our Node applications
module.exports = Users;
