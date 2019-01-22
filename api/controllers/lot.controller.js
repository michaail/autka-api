const querystring = require('querystring');
const Lot = require('../../models/lot');

// eslint-disable-next-line consistent-return
function create(req, res) {
  if (!req.body.lotID) {
    return res.status(400).send({
      message: "Lot can't be created without lotID",
    });
  }

  const lot = new Lot(req.body);

  lot.save()
    .then((data) => {
      res.send(data);
    }).catch((err) => {
      res.status(500).send({
        message: err.message || 'Something went wrong whilst saving lot',
      });
    });
}

function findAll(req, res) {
  const perPage = parseInt(req.query.perPage, 10) || 20;
  const page = parseInt(req.query.page, 10) || 1;

  const { make, model, buyer } = req.query;

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

  const lotsPromise = Lot.find(filters)
    .sort({ _id: -1 })
    .skip((page - 1) * perPage)
    .limit(perPage);

  let countPromise;
  if (filters === {}) {
    countPromise = Lot.estimatedDocumentCount(filters);
  } else {
    countPromise = Lot.countDocuments(filters);
  }

  let documents;
  let count;
  Promise.all([lotsPromise, countPromise]).then((values) => {
    [documents, count] = values;

    const meta = {
      totalCount: count,
      pagesCount: Math.ceil(count / (parseInt(req.query.per_page, 10) || 20)),
      docLength: documents.length,
      page,
    };

    res.status(200).send(JSON.stringify({
      documents,
      meta,
    }));
  });
}

function findOne(req, res) {
  Lot.findOne({ lotID: req.params.lotID })
    .then((lot) => {
      if (!lot) {
        return res.status(404).send({
          message: `No lot with lotID: ${req.params.lotID}`,
        });
      }

      return res.send([lot]);
    })
    .catch(() => res.status(500).send({
      message: `Error something went wrong whilst get lot with id: ${req.params.lotID}`,
    }));
}

function update(req, res) {
  Lot.findOneAndUpdate({ lotID: req.params.lotID },
    req.body,
    { new: true }) // zwraca zmodyfikowany dokument do then()
    .then((lot) => {
      if (!lot) {
        return res.status(404).send({
          message: `No lot with id: ${req.params.lotID}`,
        });
      }
      return res.status(200).send(lot);
    }).catch((err) => {
      if (err.kind === 'ObjectId') {
        return res.status(404).send({
          message: `No lot with id: ${req.params.lotID}`,
        });
      }
      return res.status(500).send({
        message: `Error with update lot with id: ${req.params.lotID}`,
      });
    });
}

function deleteOne(req, res) {
  Lot.findOneAndRemove({ lotID: req.params.lotID })
    .then((lot) => {
      if (!lot) {
        return res.status(404).send({
          message: `user${req.params.lotID}`,
        });
      }
      return res.send({ message: 'Lot deleted!' });
    })
    .catch((err) => {
      if (err.kind === 'ObjectId' || err.name === 'NotFound') {
        return res.status(404).send({
          message: `user${req.params.lotID}`,
        });
      }
      return res.status(500).send({
        message: `Error with delete lot with id: ${req.params.lotID}`,
      });
    });
}

module.exports.create = create;
module.exports.findAll = findAll;
module.exports.findOne = findOne;
module.exports.update = update;
module.exports.deleteOne = deleteOne;
