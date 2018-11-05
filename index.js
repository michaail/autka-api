const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');


const app = express();

app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static(`${__dirname}/build`));


require('./mongo/db')();

require('./api/routes/lot.routes')(app);

app.use((err, req, res) => {
  console.log(err);
  res.status(422).send({ errMSg: err.message });
});

app.listen(3001, () => {
  console.log('listening on 3001');
});
