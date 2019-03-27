const mongoose = require('mongoose');
const config = require('../config');

mongoose.Promise = global.Promise;

module.exports = () => {
  mongoose.connect(config.dbUrl, {
    useNewUrlParser: true,
  })
    .then(() => {
      console.log('Successfully connected to db');
    })
    .catch(() => {
      console.log('Couldn\'t connect to db');
    });
};
