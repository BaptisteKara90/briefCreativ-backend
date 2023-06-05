const mongoose = require('mongoose');

const styleTypeSchema = mongoose.Schema({
    name: String,
    sentences: [String],
})

const StyleType = mongoose.model('styleTypes', styleTypeSchema);
module.exports = StyleType;