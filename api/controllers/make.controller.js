const Make = require('../../models/make');

// eslint-disable-next-line consistent-return
function create(req, res) {
  if (!req.body.make) {
    return res.status(400).send({
      message: "Make field can't be created without make name",
    });
  }

  const make = new Make(req.body);

  make.save()
    .then((createdMake) => {
      res.send(createdMake);
    }).catch((err) => {
      res.status(500).send({
        message: err.message || 'Something went wrong',
      });
    });
}

function findAll(req, res) {
  Make.find().then((makeArray) => {
    res.status(200).send({ documents: makeArray });
  }).catch((err) => {
    res.status(404).send({
      message: `Make array not found ${err.message}`,
    });
  });
}

function update(req, res) {
  Make.findOneAndUpdate({ make: req.params.make },
    { $push: { models: req.body.model } },
    { new: true })
    .then((updatedMake) => {
      if (!updatedMake) {
        return res.status(404).send({
          message: 'Make not found',
        });
      }
      return res.status(200).send();
    }).catch(err => res.status(500).send({
      message: `Internal error: ${err.message}`,
    }));
}

module.exports.create = create;
module.exports.findAll = findAll;
module.exports.update = update;
