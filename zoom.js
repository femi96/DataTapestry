var width = Math.max(960, window.innerWidth),
    height = Math.max(500, window.innerHeight);

var tile = d3.geo.tile()
    .size([width, height]);

//create projection
var projection = d3.geo.mercator();

var zoom = d3.behavior.zoom()
    .scale(1 << 12)
    .scaleExtent([1 << 9, 1 << 23])
    .translate([width / 2, height / 2])
    .on("zoom", zoomed);

var map = d3.select("body").append("div")
    .attr("class", "map")
    .style("width", width + "px")
    .style("height", height + "px")
    .call(zoom)
    .on("mousemove", mousemoved);

var layer = map.append("div")
    .attr("class", "layer");

var info = map.append("div")
    .attr("class", "info");

// create path variable
var path = d3.geo.path()
    .projection(projection);
    
d3.json()
//create the dots
map.selectAll("circle")
.data([[-122.490402, 37.786453],[-122.389809, 37.72728]]).enter()
.append("circle")
.attr("cx", function (d) { console.log(projection(d)); return projection(d)[0]; })
.attr("cy", function (d) { return projection(d)[1]; })
.attr("r","800px")
.attr("fill","red")

zoomed();

function zoomed()
{
    var tiles = tile
        .scale(zoom.scale())
        .translate(zoom.translate())
        ();

    projection
        .scale(zoom.scale() / 2 / Math.PI)
        .translate(zoom.translate());

    var image = layer
        .style("transform", matrix3d(tiles.scale, tiles.translate))
        .selectAll(".tile")
        .data(tiles, function(d) { return d; });

    image.exit()
        .remove();

    image.enter().append("img")
        .attr("class", "tile")
        .attr("src", function(d) { return "http://" + ["a", "b", "c", "d"][Math.random() * 4 | 0] + ".tiles.mapbox.com/v3/examples.map-i86nkdio/" + d[2] + "/" + d[0] + "/" + d[1] + ".png"; })
        .style("left", function(d) { return (d[0] << 8) + "px"; })
        .style("top", function(d) { return (d[1] << 8) + "px"; });
}

function mousemoved()
{
    info.text(formatLocation(projection.invert(d3.mouse(this)), zoom.scale()));
}

function matrix3d(scale, translate)
{
    var k = scale / 256, r = scale % 1 ? Number : Math.round;
    return "matrix3d(" + [k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, r(translate[0] * scale), r(translate[1] * scale), 0, 1 ] + ")";
}

function formatLocation(p, k)
{
    var format = d3.format("." + Math.floor(Math.log(k) / 2 - 2) + "f");
    return (p[1] < 0 ? format(-p[1]) + "°S" : format(p[1]) + "°N") + " "
             + (p[0] < 0 ? format(-p[0]) + "°W" : format(p[0]) + "°E");
}
