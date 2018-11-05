const mongoose = require('mongoose');
const dbConfig = require('./db.config');

mongoose.Promise = global.Promise;

module.exports = () => {
  mongoose.connect(dbConfig.url, {
    useNewUrlParser: true,
  })
    .then(() => {
      console.log('Successfully connected to db');
    })
    .catch(() => {
      console.log('Couldn\'t connect to db');
    });
};
