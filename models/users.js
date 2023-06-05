const mongoose = require('mongoose');


const userSchema = mongoose.Schema({
    token : String,
    email : String,
    username : String,
    password: String,
    followed : [String],
    profil_id: {type: mongoose.Schema.Types.ObjectId, ref: 'profils'},
    date: { type: Date, default: Date.now },
    admin: { type: Boolean, default: false },
})

const User = mongoose.model('users', userSchema);
module.exports = User;