var mongoose = require('mongoose');


var Schema = mongoose.Schema;

var passwordRequestSchema = new Schema({
    token: {type: String, required: true},
    username: {type: String, required: true},
    date: {type: Number, default: Date.now()},
    isUsed: {type: Boolean, default: false}
}) 

var PasswordRequest = mongoose.model('PasswordRequest', passwordRequestSchema);

module.exports = PasswordRequest;

