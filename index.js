var express = require('express');
var NCP = require('ncolorpalette-clusterer');
var bodyParser = require('body-parser');
var dataUriToBuffer = require('data-uri-to-buffer')
var readimage = require('readimage');
var writegif = require('writegif');
var morgan  = require('morgan');

var app = express();

app.use(bodyParser.json({limit: '1mb'}))
app.use(express.static(__dirname + '/public'))
app.use(morgan('tiny'));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
})

app.post('/service', function(req, res) {
  var buf = dataUriToBuffer(req.body.content.data);
  readimage(buf, function(err, image) {
    if (err) {
      res.json(err);
      return;
    }

    var input = new Uint8ClampedArray(image.frames[0].data);

    var c = new NCP(input);
    c.solve(function(){}, function(count) {

      var palette = [
        0, 60, 16, 255,
        6, 103, 49, 255,
        123, 180, 0, 255,
        138, 196, 0, 255
      ]

      for (var i = 0; i < 4; i++) {
        c.applyPalette(palette, input);
        var frame = image.frames[i] || (image.frames[i] = {});
        frame.data = new Buffer(input);
        frame.delay = 1000;
        palette = cycle(palette, (i + 1) * 4);
      }

      writegif(image, function(err, output) {
        res.json({
          content: {
            data: 'data:image/gif;base64,'
            + output.toString('base64')
          }
        })
      })
    })
  })
})

function cycle(palette, startPixel) {
  var next = palette.slice(startPixel);
  next.push.apply(next, palette.slice(0, startPixel));
  return next;
}

if (!module.parent) {
  app.listen(8000);
}

module.exports = app;