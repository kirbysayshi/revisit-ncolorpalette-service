var test = require('tape');
var fs = require('fs');
var r = require('supertest');
var app = require('./');

var kirby = 'data:image/png;base64,'
  + fs.readFileSync('./fixtures/kirby.png').toString('base64');

test('png -> gif', function(t) {

  r(app)
    .post('/service')
    .send({ content: { data: kirby } })
    .expect(200)
    .expect('Content-Type', /json/)
    .expect(/\{"data":"data:image\/gif/)
    .end(function(err, res) {
      t.end(err);
    })

});