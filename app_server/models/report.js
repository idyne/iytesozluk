var mongoose = require('mongoose');


var Schema = mongoose.Schema;

var reportSchema = new Schema({
    entryID: {type: String, required: true},
    owner: {type: String, required: true},
    date: {type: Number, required: true},
    entry: {type: String, required: true}
}) 

var Report = mongoose.model('Report', reportSchema);

module.exports = Report;

