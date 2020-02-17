var mongoose = require('mongoose');


var Schema = mongoose.Schema;

var userSchema = new Schema({
    username: { type: String, required: true },
    email: { type: String, required: true },
    birthDate: { type: Date, required: true },
    gender: { type: String, required: true },
    password: { type: String, required: true },
    salt: { type: String, required: true },
    registerDate: { type: Date, required: true },
    status: { type: String, required: true },
    emailToken: { type: String, required: true },
    userType: { type: String, required: true },
    nices: { type: Array, default: [] },
    bads: { type: Array, default: [] },
    ips: Array
})

var User = mongoose.model('User', userSchema);

module.exports = User;

