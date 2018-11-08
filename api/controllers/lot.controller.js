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

async function findAll(req, res) {
  const queryJSON = {};
  let linksString = '';
  if (req.query.make) {
    queryJSON.make = req.query.make;
    linksString += `&make=${req.query.make}`;
  }
  if (req.query.model) {
    queryJSON.model = req.query.model;
    linksString += `&model=${req.query.model}`;
  }
  if (req.query.saleType) {
    queryJSON.saleType = req.query.saleType;
    linksString += `&saleType=${req.query.saleType}`;
  }
  if (req.query.location) {
    queryJSON.location = req.query.location;
    linksString += `&location=${req.query.location}`;
  }

  // Lot.find().then((lots) => {
  //   res.status(200).send(lots);
  // }).catch((err) => {
  //   console.log(err.message);
  // })


  const lotPromise = Lot.paginate(queryJSON, {
    limit: parseInt(req.query.per_page, 10) || 20,
    page: parseInt(req.query.page, 10) || 1,
  });
  const countPromise = Lot.countDocuments();
  // TODO try catch?
  const [lots, count] = await Promise.all([lotPromise, countPromise]);
  const links = {};
  if (lots.pages) {
    if (lots.page < lots.pages) {
      links.next = `${req.protocol}://${req.get('host')}${req.path}?page=${parseInt(lots.page, 10) + 1}${linksString}`;
    }
    if (lots.page > 1) {
      links.previous = `${req.protocol}://${req.get('host')}${req.path}?page=${parseInt(lots.page, 10) - 1}${linksString}`;
    }
  }

  res.links(links);
  res.set('total-count', count);
  res.set('docs-length', lots.docs.length);
  return res.status(200).send(lots.docs);
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
      return res.send(lot);
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
