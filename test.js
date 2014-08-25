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
    .end(function(err, res) {
      t.ok(res.body.content, 'has content');
      t.ok(/^data:image\/gif/.exec(res.body.content.data), 'is data-uri');
      t.end(err);
    })

});