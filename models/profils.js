const mongoose = require('mongoose');

const reseauxSchema = mongoose.Schema({
    facebook: String,
    linkedin: String,
    twitter: String,
    instagram: String,
})

const profilSchema = mongoose.Schema({
    avatar: String,
    bio: String,
    reseaux: reseauxSchema,
    user_id: {type: mongoose.Schema.Types.ObjectId, ref: 'users'},
})

const Profil = mongoose.model('profils', profilSchema);
module.exports = Profil;