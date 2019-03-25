const mongoose = require('mongoose');

const { Schema } = mongoose;

const makeSchema = new Schema({
  make: String,
  models: [],
}, {
  timestamps: true,
});

// module.exports.Make = {
//   model: mongoose.model('Make', makeSchema),

//   existsInDB(name) {
//     this.model.findOne({ make: name })
//       .then((makeObj) => {
//         if (!makeObj) {
//           return false;
//         }
//         return true;
//       }).catch(() => false);
//   },


// };


module.exports = mongoose.model('Make', makeSchema);
