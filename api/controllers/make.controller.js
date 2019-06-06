const Make = require('../../models/make');

// eslint-disable-next-line consistent-return
async function create(req, res) {
  if (!req.body.make) {
    return res.status(400).send({
      message: "Make field can't be created without make name",
    });
  }

  const make = new Make(req.body);
  let result;
  try {
    result = await make.save();
  } catch (e) {
    return res.status(500).send({
      message: e.message || 'Something went wrong',
    });
  }

  return res.status(200).send(result);
}

async function findAll(req, res) {
  let documents;
  try {
    documents = await Make.find();
  } catch (err) {
    return res.status(404).send({
      message: `Make array not found ${err.message}`,
    });
  }

  // make one object from results
  const makesObject = {};
  documents.forEach((doc) => {
    makesObject[doc.make] = doc.models;
  });

  return res.status(200).send(makesObject);
}

async function update(req, res) {
  let result;
  try {
    result = await Make.findOneAndUpdate({ make: req.params.make },
      { $push: { models: req.body.model } },
      { new: true });
  } catch (e) {
    res.status(500).send({
      message: `Internal error: ${e.message}`,
    });
  }

  if (!result) {
    return res.status(404).send({
      message: 'Make not found',
    });
  }
  return res.status(200).send();
}

module.exports.create = create;
module.exports.findAll = findAll;
module.exports.update = update;
