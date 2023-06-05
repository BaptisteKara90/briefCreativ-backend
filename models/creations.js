const mongoose = require('mongoose');

const commentaireSchema = mongoose.Schema({
    date:{type: Date, default: Date.now},
    user_id: {type: mongoose.Schema.Types.ObjectId, ref: 'users'},
    message: String,
    like: { type: [String], default: [] },
    visible: { type: Boolean, default: true },
})

const creationSchema = mongoose.Schema({
    images: { type: [String], default: [] },
    brief_id: {type: mongoose.Schema.Types.ObjectId, ref: 'briefs'},
    like: { type: [String], default: [] },
    commentaires: { type: [commentaireSchema], default: [] },
    description_autor: String,
    autor: {type: mongoose.Schema.Types.ObjectId, ref: 'users'},
    signalement: { type: [String], default: [] },
    visible: { type: Boolean, default: true },
    private: {type: Boolean, default: false}
})

const Creation = mongoose.model('creations', creationSchema);
module.exports= Creation;