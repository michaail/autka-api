const make = require('../controllers/make.controller');

module.exports = (app) => {
  app.post('/api/makes', make.create);

  app.get('/api/makes', make.findAll);

  app.put('/api/makes/', make.update);
};
