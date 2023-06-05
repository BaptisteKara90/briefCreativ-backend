const mongoose = require('mongoose');

const projectTypeSchema = mongoose.Schema({
    name: String,
    sentences: [String],
    max_delay: Number,
    min_delay: Number,
})

const ProjectType = mongoose.model('projectTypes', projectTypeSchema)
module.exports = ProjectType;