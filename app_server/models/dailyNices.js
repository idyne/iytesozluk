var mongoose = require('mongoose');


var Schema = mongoose.Schema;

var dailyNicesSchema = new Schema({
    count: {type: Number, default: 0},
    date: {type: Number, default: Date.now()},
    entry: {type: String, required: true},
}) 

var DailyNices = mongoose.model('DailyNices', dailyNicesSchema);

module.exports = DailyNices;

