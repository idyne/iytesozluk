var mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

var Schema = mongoose.Schema;

var conversationSchema = new Schema({
    id: Number,
    owner: { type: String, required: true },
    other: { type: String, required: true },
    messages: { type: Array, default: [] },
    lastMessage: Object
})

conversationSchema.plugin(AutoIncrement, { id: "conversation_seq", start_seq: 104578, inc_field: "id" })

var Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;

