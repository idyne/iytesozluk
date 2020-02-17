var mongoose = require('mongoose');
var random = require('mongoose-simple-random');
const AutoIncrement = require('mongoose-sequence')(mongoose);


var Schema = mongoose.Schema;

var topicSchema = new Schema({
    id: Number,
    topic: { type: String, required: true, unique: true },
    entries: { type: Array, required: true },
    link: { type: String, required: true, unique: true },
    date: { type: Number, default: Date.now() },
    lastUpdate: { type: Number, default: Date.now() }
})

topicSchema.plugin(random)
topicSchema.plugin(AutoIncrement, { id: "topic_seq", start_seq: 34776, inc_field:"id"})

var Topic = mongoose.model('Topic', topicSchema);

module.exports = Topic;

