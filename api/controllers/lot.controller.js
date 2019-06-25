const Lot = require('../../models/lot');

// POST -- new lot
async function create(req, res) {
  if (!req.body.lotID) {
    return res.status(400).send({
      message: "Lot can't be created without lotID",
    });
  }

  const lot = new Lot(req.body);
  let result;
  try {
    result = await lot.save();
  } catch (e) {
    return res.status(500).send({
      message: e.message || 'Something went wrong whilst saving lot',
    });
  }
  return res.status(200).send(result);
}

// GET -- all using queryString
async function findAll(req, res) {
  const pageSize = parseInt(req.query.pageSize, 10) || 20;
  const page = parseInt(req.query.page, 10) || 1;
  const pagination = {
    pageSize,
    page,
  };

  const {
    make, model, buyer, location,
  } = req.query;

  const filters = {};
  if (make) {
    filters.make = make;
  }
  if (model) {
    filters.model = model;
  }
  if (buyer) {
    filters.buyer = buyer;
  }
  if (location) {
    filters.location = location;
  }

  let lots;
  try {
    lots = await Lot.getAllAuctionsByFilters(filters, -1, pagination);
  } catch (e) {
    return res.status(404).send();
  }

  let count;
  try {
    if (filters === {}) {
      count = await Lot.estimatedDocumentCount(filters);
    } else {
      count = await Lot.countDocuments(filters);
    }
  } catch (e) {
    return res.status(404).send();
  }

  const meta = {
    totalCount: count,
    pagesCount: Math.ceil(count / (parseInt(req.query.per_page, 10) || 20)),
    docLength: lots.length,
    page,
  };


  return res.status(200).send(JSON.stringify({
    documents: lots,
    meta,
  }));
}

// GET -- all entries for one lotID
async function findOne(req, res) {
  const { lotID } = req.params;
  let lots;

  try {
    lots = await Lot.getAllAuctionsByLotID(lotID);
  } catch (e) {
    return res.status(500).send({
      message: `Error something went wrong whilst get lot with id: ${lotID}`,
    });
  }
  if (!lots) {
    return res.status(404).send({
      message: `No lot with lotID: ${lotID}`,
    });
  }
  return res.status(200).send(lots);
}

// PUT -- not used rn
async function update(req, res) {
  const { lotID } = req.params;
  let result;

  try {
    result = await Lot.findOneAndUpdate({ lotID },
      req.body,
      { new: true });
  } catch (e) {
    if (e.kind === 'ObjectId') {
      return res.status(404).send({
        message: `No lot with id: ${lotID}`,
      });
    }
    return res.status(500).send({
      message: `Error with update lot with id: ${lotID}`,
    });
  }

  if (!result) {
    return res.status(404).send({
      message: `No lot with id: ${lotID}`,
    });
  }
  return res.status(200).send(result);
}

// DELETE -- not used rn
async function deleteOne(req, res) {
  const { lotID } = req.params;
  let result;

  try {
    Lot.findOneAndRemove({ lotID });
  } catch (e) {
    if (e.kind === 'ObjectId' || e.name === 'NotFound') {
      return res.status(404).send({
        message: `user${lotID}`,
      });
    }
    return res.status(500).send({
      message: `Error with delete lot with id: ${lotID}`,
    });
  }

  if (!result) {
    return res.status(404).send({
      message: `user${lotID}`,
    });
  }
  return res.status(200).send({ message: `Lot: ${lotID} - deleted!` });
}

// POST -- search using req body
async function find(req, res) {
  const { pagination, search, filters } = req.body;
  const { page, pageSize } = pagination || { page: 1, pageSize: 20 };

  const minYear = search.minYear || 1900;
  const maxYear = search.maxYear || new Date().getFullYear() + 1;
  let year;

  if (search.minYear || search.maxYear) {
    year = { $gte: minYear, $lte: maxYear };
  }

  const minPrice = search.minPrice || undefined;
  const maxPrice = search.maxPrice || undefined;
  let priceInt;

  if (search.minPrice && !search.maxPrice) {
    priceInt = { $gte: minPrice };
  } else if (search.maxPrice && !search.minPrice) {
    priceInt = { $lte: maxPrice };
  } else if (search.minPrice && search.maxPrice) {
    priceInt = { $gte: minPrice, $lte: maxPrice };
  }

  const searchReady = {
    make: search.make || undefined,
    model: search.model || undefined,
    year,
    priceInt,
  };

  const searchString = await JSON.stringify({ ...searchReady, ...filters });
  const searchObject = await JSON.parse(searchString);

  let documents;
  try {
    documents = await Lot.getAllAuctionsByFilters(searchObject, -1, pagination);
  } catch (error) {
    return res.status(500).send({
      message: 'internal server error',
    });
  }

  const count = await Lot.countDocuments(searchObject);

  const meta = {
    totalCount: count,
    pagesCount: Math.ceil(count / (parseInt(pageSize, 10) || 20)),
    docLength: documents.length,
    page,
  };

  return res.status(200).send(JSON.stringify({
    documents,
    meta,
  }));
}

module.exports.create = create;
module.exports.findAll = findAll;
module.exports.findOne = findOne;
module.exports.update = update;
module.exports.deleteOne = deleteOne;
module.exports.find = find;
