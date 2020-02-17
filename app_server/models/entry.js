var mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

var Schema = mongoose.Schema;

var entrySchema = new Schema({
    id: Number,
    topic: { type: String, required: true },
    entry: { type: String, required: true },
    date: { type: Number, default: Date.now() },
    owner: { type: String, required: true },
    nices: { type: Number, default: 0 },
})

entrySchema.plugin(AutoIncrement, { id: "entry_seq", start_seq: 177, inc_field:"id"})


var Entry = mongoose.model('Entry', entrySchema);

module.exports = Entry;

