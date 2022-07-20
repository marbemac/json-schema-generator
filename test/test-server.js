const express = require('express');
const app = express();

const jsonFixture = require('./fixtures/json/valid.json')
app.get('/valid', function(req, res) {
  res.status(200).json(jsonFixture);
});

server = app.listen(9002, 'localhost');