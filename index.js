var express = require('express');
var bodyParser = require('body-parser');
var morgan  = require('morgan');

var NCP = require('ncolorpalette-clusterer');
var palettes = require('ncolorpalette-palettes');
var dataUriToBuffer = require('data-uri-to-buffer')
var readimage = require('readimage');
var writegif = require('writegif');

var app = express();

app.use(bodyParser.json({limit: '1mb'}))
app.use(express.static(__dirname + '/public'))
app.use(morgan('tiny'));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
})

app.post('/gameboy/service', function(req, res) {
  // same as below but doesn't cycle, always outputs gif
})

app.post('/cycled-gameboy/service', function(req, res) {
  var buf = dataUriToBuffer(req.body.content.data);
  readimage(buf, function(err, image) {
    if (err) {
      res.json(err);
      return;
    }

    // TODO: instead compute Cluster for each frame...
    var input = image.frames[0].data;

    var c = new NCP(input);
    c.solve(function(){}, function(count) {

      applyCyclePalette(c, image, palettes.gameboy.pixels);

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

function applyCyclePalette(clusterer, image, palette) {
  var cycles = Math.max(image.frames.length, palette.length / 4);
  var cycled = palette;
  for (var i = 0; i < cycles; i++) {
    var paletteStart = (i*4) % palette.length;
    cycled = palette.slice(paletteStart);
    cycled.push.apply(cycled, palette.slice(0, paletteStart));
    clusterer.applyPalette(cycled, clusterer.pixels);
    var frame = image.frames[i] || (image.frames[i] = {});
    // This needs to copy the data.
    frame.data = new Buffer(clusterer.pixels);
    frame.delay = frame.delay || 100;
  }
  return image;
}

if (!module.parent) {
  var server = app.listen(8000);
  process.on('SIGINT', function() {
    server.close();
    process.exit();
  });
}

module.exports = app;