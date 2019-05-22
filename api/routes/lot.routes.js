const lots = require('../controllers/lot.controller');

module.exports = (app) => {
  // GET    - return all lots
  app.get('/api/lots', lots.findAll);

  // POST   - create new lot - (ADDITIONAL)
  // app.post('/api/lots', lots.create);

  // GET    - return single lot with lotID
  app.get('/api/lots/:lotID', lots.findOne);

  // PUT    - update single lot with lotID
  app.put('/api/lots/:lotID', lots.update);

  // POST   - search for lots (search filters in body)
  app.post('/api/lots/search', lots.search);

  // DELETE - delete single lot with lotID
  // app.delete('/api/lots/:lotID', lots.deleteOne);
};
