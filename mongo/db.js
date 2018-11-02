const dbConfig = require('./db.config');
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

module.exports = function (app) {
  mongoose.connect(dbConfig.url, {
    useNewUrlParser: true
  })
    .then(() => {
      console.log(`Successfully connected to db`);
    })
    .catch(err => {
      console.log(`Couldn't connect to db`)
    })
}