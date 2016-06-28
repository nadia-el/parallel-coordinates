pc.interactive = function() {
  flags.interactive = true;
  return this;
};

// expose a few objects
pc.xscale = xscale;
pc.ctx = ctx;
pc.canvas = canvas;
pc.g = function() { return g; };

// rescale for height, width and margins
// TODO currently assumes chart is brushable, and destroys old brushes
pc.resize = function() {
  // selection size
  pc.selection.select("svg")
    .attr("width", __.width)
    .attr("height", __.height)
  pc.svg.attr("transform", "translate(" + __.margin.left + "," + __.margin.top + ")");

  // FIXME: the current brush state should pass through
  if (flags.brushable) pc.brushReset();

  // scales
  pc.autoscale();

  // axes, destroys old brushes.
  if (g) pc.createAxes();
  if (flags.brushable) pc.brushable();
  if (flags.reorderable) pc.reorderable();

  events.resize.call(this, {width: __.width, height: __.height, margin: __.margin});
  return this;
};

// highlight an array of data
pc.highlight = function(data) {
  if (arguments.length === 0) {
    return __.highlighted;
  }

  __.highlighted = data;
  pc.clear("highlight");
  d3.selectAll([canvas.foreground, canvas.brushed]).classed("faded", true);
  data.forEach(path_highlight);
  events.highlight.call(this, data);
  return this;
};

// clear highlighting
pc.unhighlight = function() {
  __.highlighted = [];
  pc.clear("highlight");
  d3.selectAll([canvas.foreground, canvas.brushed]).classed("faded", false);
  return this;
};

// calculate 2d intersection of line a->b with line c->d
// points are objects with x and y properties
pc.intersection =  function(a, b, c, d) {
  return {
    x: ((a.x * b.y - a.y * b.x) * (c.x - d.x) - (a.x - b.x) * (c.x * d.y - c.y * d.x)) / ((a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x)),
    y: ((a.x * b.y - a.y * b.x) * (c.y - d.y) - (a.y - b.y) * (c.x * d.y - c.y * d.x)) / ((a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x))
  };
};

function position(d) {
  if (xscale.range().length === 0) {
    xscale.rangePoints([0, w()], 1);
  }
  var v = dragging[d];
  return v == null ? xscale(d) : v;
}

// Merges the canvases and SVG elements into one canvas element which is then passed into the callback
// (so you can choose to save it to disk, etc.)
pc.mergeParcoords = function(callback) {
  // Retina display, etc.
  var devicePixelRatio = window.devicePixelRatio || 1;

  // Create a canvas element to store the merged canvases
  var mergedCanvas = document.createElement("canvas");
  mergedCanvas.width = pc.canvas.foreground.clientWidth;
  mergedCanvas.height = pc.canvas.foreground.clientHeight + 30;

  // Give the canvas a white background
  var context = mergedCanvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, mergedCanvas.width, mergedCanvas.height);

  // Merge all the canvases
  for (var key in pc.canvas) {
    context.drawImage(pc.canvas[key], 0, 24, mergedCanvas.width, mergedCanvas.height - 30);
  }

  // Add SVG elements to canvas
  var DOMURL = window.URL || window.webkitURL || window;
  var serializer = new XMLSerializer();
  var svgStr = serializer.serializeToString(pc.selection.select("svg")[0][0]);

  // Create a Data URI.
  var src = 'data:image/svg+xml;base64,' + window.btoa(svgStr);
  var img = new Image();
  img.onload = function () {
    context.drawImage(img, 0, 0);
    if (typeof callback === "function") {
      callback(mergedCanvas);
    }
  };
  img.src = src;
}
