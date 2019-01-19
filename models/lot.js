const mongoose = require('mongoose');
// const mongoPaginate = require('mongo-cursor-pagination')
// const mongoosePaginate = require('mongoose-paginate');

const { Schema } = mongoose;

const lotSchema = new Schema({
  lotID: String,
  fullName: String,
  make: String,
  model: String,
  year: String,
  price: String,
  priceInt: Number,
  plPrice: String,
  plPriceInt: Number,
  uaPrice: String,
  uaPriceInt: Number,
  buyer: String,
  saleType: String,
  location: String,
  lotInfoHTML: String,
  certificates: [],
  details: {},
  hasPictures: Boolean,
}, {
  timestamps: true,
});

// lotSchema.plugin(mongoosePaginate);
// lotSchema.plugin(mongoPaginate.mongoosePlugin);

// module.exports.Lot = {
//   model: mongoose.model('Lot', lotSchema),
// };


module.exports = mongoose.model('Lot', lotSchema);
