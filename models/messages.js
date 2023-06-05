const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
   send_user: {type: mongoose.Schema.Types.ObjectId, ref: 'users'},
   receive_user: {type: mongoose.Schema.Types.ObjectId, ref: 'users'},
   message: String,
   date: Date,
   vu: Boolean
})

const Message = mongoose.model('messages', messageSchema)
module.exports = Message;