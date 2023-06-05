const mongoose = require('mongoose');

const businessTypeSchema = new mongoose.Schema({
    name: String,
    sentences: [String],
    businessEntries: [{
      businessName: [String],
      specialities: [String]
    }]
  });
  

const BusinessType = mongoose.model('businessTypes', businessTypeSchema);
module.exports = BusinessType;