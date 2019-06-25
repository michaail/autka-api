const mongoose = require('mongoose');

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

lotSchema.statics = {
  async getAllAuctionsByLotID(lotID, sort, limit) {
    try {
      return this.find({ lotID })
        .sort({ _id: sort || -1 })
        .limit(limit || 20);
    } catch (error) {
      throw error;
    }
  },

  async getAllAuctionsByFilters(filters, sort, pagination) {
    const { page, pageSize } = pagination;
    try {
      return this.find(filters)
        .sort({ _id: sort || -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize);
    } catch (error) {
      throw error;
    }
  },
};

module.exports = mongoose.model('Lot', lotSchema);
