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

app.get(/^\/(?:gameboy|cycled-gameboy)$/, function(req, res) {
  res.sendFile(__dirname + '/index.html');
})

app.post('/gameboy/service', function(req, res) {
  // same as below but doesn't cycle, always outputs gif
  var buf = dataUriToBuffer(req.body.content.data);
  readimage(buf, function(err, image) {
    if (err) {
      return finish(err);
    }

    solveImage(image, function(err, cs) {
      var palette = palettes.gameboy.pixels.slice(0);
      image.frames.forEach(function(frame, i) {
        var c = cs[i];
        c.applyPalette(palette, frame.data);
      })
      writegif(image, finish)
    })
  })

  function finish(err, buf) {
    if (err) {
      return res.status(500).json(err);
    }
    res.json({
      content: {
        data: 'data:image/gif;base64,'
        + buf.toString('base64')
      }
    })
  }
})

app.post('/cycled-gameboy/service', function(req, res) {
  var buf = dataUriToBuffer(req.body.content.data);
  readimage(buf, function(err, image) {
    if (err) {
      return finish(err);
    }

    solveImage(image, function(err, cs) {
      var palette = palettes.gameboy.pixels.slice(0);
      applyCyclePalette(cs, image, palette);
      writegif(image, finish)
    })
  })

  function finish(err, buf) {
    if (err) {
      return res.status(500).json(err);
    }
    res.json({
      content: {
        data: 'data:image/gif;base64,'
        + buf.toString('base64')
      }
    })
  }
})

function applyCyclePalette(clusterers, image, palette) {
  var cycles = Math.max(image.frames.length, palette.length / 4);
  var cycled = palette;
  for (var i = 0; i < cycles; i++) {
    // If there are fewer clusters than cycles (e.g. fewer
    // frames than palette colors), match the clusterer up
    // with each frame.
    var clusterer = clusterers[i % clusterers.length];

    // ensure we wrap around forever with the palette.
    var paletteStart = (i*4) % palette.length;
    cycled = palette.slice(paletteStart);
    cycled.push.apply(cycled, palette.slice(0, paletteStart));
    clusterer.applyPalette(cycled, clusterer.pixels);

    // Grab or create the frame. This needs to copy the data.
    var frame = image.frames[i] || (image.frames[i] = {});
    frame.data = new Buffer(clusterer.pixels);
    frame.delay = frame.delay || 100;
  }
  return image;
}

function solveImage(image, cb) {
  var solved = [];
  var solvedCount = 0;
  image.frames.forEach(function(frame, i) {
    var c = new NCP(frame.data);
    c.solve(function(){}, onSolve.bind(null, i))
  })

  function onSolve(frameIdx, clusterer) {
    solved[frameIdx] = clusterer;
    solvedCount += 1;
    if (solvedCount !== image.frames.length) return;
    cb(null, solved);
  }
}

if (!module.parent) {
  var port = process.ENV.PORT || 8000;
  var msg = 'listening on port ' + port;
  var server = app.listen(port, console.log.bind(console, msg));
  process.on('SIGINT', function() {
    server.close();
    process.exit();
  });
}

module.exports = app;