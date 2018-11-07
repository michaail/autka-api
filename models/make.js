const mongoose = require('mongoose');

const { Schema } = mongoose;

const makeSchema = new Schema({
  make: String,
  models: [],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Make', makeSchema);
