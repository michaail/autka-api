const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

require('./mongo/db')();

require('./api/routes/lot.routes')(app);
require('./api/routes/make.routes')(app);

app.listen(3001, () => {
  console.log('listening on 3001');
});
