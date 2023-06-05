const mongoose = require('mongoose');


const briefSchema = mongoose.Schema({
    entrepriseName: String,
    entrepriseType: String,
    entrepriseSentence: String,
    projectType: String,
    projectSentence: String,
    styleType: String,
    styleSentence: String,
    delay: String,
    speciality: String,
    color: [String],
    user_id: [{type: mongoose.Schema.Types.ObjectId, ref: 'users'}],
    date: { type: Date, default: Date.now },
    creations_id: [{type: mongoose.Schema.Types.ObjectId, ref: 'creations'}],
})

const Brief = mongoose.model('briefs', briefSchema);
module.exports = Brief;