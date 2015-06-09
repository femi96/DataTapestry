"use strict";

//TFX for things that need to be changed. Stands for ToFix

//Speration charactes for latlon to decimal conversion. These values dont work.
var sep = ['\xB0','\x2032','\x2033'];

//For getting mIDs. URL Str
var mIDurl = "https://www.qnt.io/api/displaymetrics?pID=earth_tapestry&mode=all&key=54c67cc51c61be6e9acb1159";

//For getting data.
var datmIDs = []; //Stores all data mIDs. mID Str
var daten = []; //Whether or not a set is to be showed. Bool
var datcolors = []; //Colors. Str
var datlim = '500'; //How many entries it can take. Int

var initcolors = ['#e74c3c','#e67e22','#f1c40f','#1abc9c','#2ecc71','#3498db','#9b59b6','#34495e']

var tdatlist = {}; //Top data list. For top 5 list

var optmenu = false;
var autochange = true; //Whether list updates
var weighted = true; //Whether top list is weighted or not
var circave = false; //Whether to use the circle color/size averaging
var rorder = false; //Order to stack circles
var lowmap = false; //Whether to use a low res map

//For storing data
var fdat = []; //Array of idats in the form {cID, ll, nll, vote, voteavg, loc_name, wiki_url, desc, image}

//For update safety. Prevents full updates prior to loading.
var loaded = false;

//For displaying data. Will be options
var datscale = 6; //Scalar of radius size
var datexp = 3; //Exponent of vote/voteavg of radius size

//For creating display for SVG
var height = $(window).height()-48;//Was 500
var width = $(window).width()-172;//Was 628

//Create projection for SVG
var projection = d3.geo.mercator()
	.translate([0,0]/*[width/2,height/2]*/)
	.center([0, 30])
	.scale(width/2/Math.PI/*Math.min(width/628,height/500)*100*/);

//Create Zoom for SVG
var zoom = d3.behavior.zoom()
	.scaleExtent([1, 100000])
	.on("zoom", move);
var lastscale = zoom.scale();
var lasttrans = zoom.translate();

//Create path for SVG
var path = d3.geo.path()
	.projection(projection);

//Create SVG Variables
var divwa = document.getElementsByClassName("map")[0]; //Div for SVG

var ttdiv = d3.select(divwa)
	.append("div")
	.attr("class","tooltip")
	.style("opacity", 0);

var svg = d3.select(divwa)
	.append("svg")
	.attr("width", width)
	.attr("height", height)
	.append("g")
	.attr("transform", "translate("+width/2+","+height/2+")")
	.call(zoom);

var g = svg.append("g");

//For resize delay
var delay = (function()
{
	var timer = 0;
	return function(callback, ms)
	{
		clearTimeout (timer);
		timer = setTimeout(callback, ms);
	};
})();

window.onload = function()
{
	$.getJSON('https://www.qnt.io/api/results?pID=earth_tapestry&mID=54dcfc4f87f85f1b3989e61c&limit=500&skip=5&sort=1&key=54c67cc51c61be6e9acb1159',function(fthis)
	{
		//TFX This is a workaround because the values for sep don't work how they need to.
		var needthis = fthis.results[3].content_data.lat_long_alt;
		sep = [needthis[2], needthis[5], needthis[8]];
		getmID();
		mapworld();
	});
}
$(window).resize(function()
{
	delay(function()
	{
		updatewindow();
	}, 125);
});

function resetcircle() //Resets the circles
{
	svg.selectAll("circle").remove();
}

function updatewindow()
{
	if(!loaded)
	{
		return
	}
	d3.select(divwa).selectAll("div").remove();
	d3.select(divwa).selectAll("svg").remove();
	
	height = $(window).height()-48;//Was 500
	width = $(window).width()-172;//Was 628

//Create projection for SVG
	projection = d3.geo.mercator()
	.translate([0,0])
	.center([0, 30])
	.scale(width/2/Math.PI);

//Create Zoom for SVG
	zoom = d3.behavior.zoom()
	.scaleExtent([1, 100000])
	.on("zoom", move).scale(lastscale).translate(lasttrans);

//Create path for SVG
	path = d3.geo.path()
	.projection(projection);

//Create SVG Variables
	divwa = document.getElementsByClassName("map")[0]; //Div for SVG

	ttdiv = d3.select(divwa)
	.append("div")
	.attr("class","tooltip")
	.style("opacity", 0);

	svg = d3.select(divwa)
	.append("svg")
	.attr("width", width)
	.attr("height", height)
	.append("g")
	.attr("transform", "translate("+width/2+","+height/2+")")
	.call(zoom);

	g = svg.append("g");
	zoom.event(svg);
	mapworld()
}

function update() //Calls all update functions
{
	if(loaded)
	{
		updateopts();
		changelist();
	}
}

function updaterad() //Update the circle radii
{
	if(!loaded)
	{
		return
	}
	circave = document.getElementById('opt_circave').checked;
	var circle = d3.selectAll("circle");
	if(circave)
	{
		circle.attr("r", function(d)
		{
			return (datscale*Math.pow(d.vote/d.tvoteavg,datexp))/Math.pow(zoom.scale(),0.5)+"px";
		});
	}
	else
	{
		circle.attr("r", function(d)
		{
			return (datscale*Math.pow(d.vote/d.voteavg,datexp))/Math.pow(zoom.scale(),0.5)+"px";
		});
	}
}

function updateopt()
{
	optmenu = document.getElementById('opt_on').checked;
	var options = document.getElementsByClassName('option')[0];
	if(optmenu)
	{
		options.style.left = '152px';
		options.style.top = '48px';
	}
	else
	{
		options.style.left = '-1520px';
		options.style.top = '-1520px';
	}
}

function updateopts() //Update options
{
	if(!loaded)
	{
		return
	}
	for (var ind in datmIDs)
	{
		datcolors[ind] = document.getElementById('opt_color'+ind.toString()).value;
		daten[ind] = document.getElementById('scheck'+ind.toString()).checked;
	}
	datscale = document.getElementById("opt_scale").value;
	datexp = document.getElementById("opt_exp").value;
	mapit();
}

function updatelist() //Update list html
{
	if(!loaded)
	{
		return
	}
	var e = document.getElementById("opt_topsel");
	var i = e.options[e.selectedIndex].value;

	var tlist = document.getElementById('top');
	var tdat = {};
	if(i == -1)
	{
		tdat = updatetdatlist();
	}
	else
	{
		tdat = fdat[i];
	}
	var len = tdat.length;
	tlist.innerHTML = '<br>';
	tlist.innerHTML += '1.<a href="'+tdat[0].wiki_url+'" target="_blank">'+tdat[0].loc_name+'</a><br>';
	tlist.innerHTML += '2.<a href="'+tdat[1].wiki_url+'" target="_blank">'+tdat[1].loc_name+'</a><br>';
	tlist.innerHTML += '3.<a href="'+tdat[2].wiki_url+'" target="_blank">'+tdat[2].loc_name+'</a><br>';
	tlist.innerHTML += '4.<a href="'+tdat[3].wiki_url+'" target="_blank">'+tdat[3].loc_name+'</a><br>';
	tlist.innerHTML += '5.<a href="'+tdat[4].wiki_url+'" target="_blank">'+tdat[4].loc_name+'</a><br>';
}

function updatetdatlist() //Update tdat for list
{
	//fdat[x][i] = idat
	//idat = {cID, ll, nll, vote, voteavg, loc_name, wiki_url, desc, image}
	//ndat = {cID, ll, nll, vote, tvoteavg, loc_name, wiki_url, desc, image, votesum, colorset}
	//colorset = [colors, mu]
	tdatlist = [];
	var tindlist = [];
	var tvoteavg = 0;
	for (var f in fdat)
	{
		tvoteavg += fdat[f][0].voteavg;
	}
	tvoteavg = tvoteavg/fdat.length;
	for (var i in fdat[0])
	{
		tindlist.push(fdat[0][i].cID);
		var idat = fdat[0][i];
		var ndat = {};
		ndat.cID = idat.cID;
		ndat.ll = idat.ll;
		ndat.nll = idat.nll;
		ndat.vote = 0;
		ndat.tvoteavg = tvoteavg;
		ndat.loc_name = idat.loc_name;
		ndat.wiki_url = idat.wiki_url;
		ndat.desc = idat.desc;
		ndat.image = idat.image;
		ndat.votesum = 0;
		ndat.colorset = [];
		tdatlist.push(ndat);
	}
	//TFX Slow?
	weighted = document.getElementById('opt_weighted').checked;
	for (var f in fdat)
	{
		if(daten[f])//If the fdat should be displayed
		{
			for (var i in fdat[f])//For getting tdat.votesum. @ fdat[x][i] = idat
			{
				var t = tindlist.indexOf(fdat[f][i].cID);
				if(t == -1)
				{
					tindlist.push(fdat[f][i].cID);
					var idat = fdat[f][i];
					var ndat = {};
					ndat.cID = idat.cID;
					ndat.ll = idat.ll;
					ndat.nll = idat.nll;
					ndat.vote = 0;
					ndat.tvoteavg = tvoteavg;
					ndat.loc_name = idat.loc_name;
					ndat.wiki_url = idat.wiki_url;
					ndat.desc = idat.desc;
					ndat.image = idat.image;
					ndat.votesum = 0;
					ndat.colorset = [];
					tdatlist.push(ndat);
					t = tindlist.length-1;
				}
				tdatlist[t].votesum += 1
			}
		}
	}
	for (var f in fdat)
	{
		if(daten[f])//If the fdat should be displayed
		{
			for (var i in fdat[f])//For getting tdat.vote. @ fdat[x][i] = idat
			{
				var t = tindlist.indexOf(fdat[f][i].cID)
				if(weighted)
				{
					tdatlist[t].vote += fdat[f][i].vote/tdatlist[t].votesum;
				}
				else
				{
					tdatlist[t].vote += fdat[f][i].vote;
				}
				tdatlist[t].colorset.push([datcolors[f],(fdat[f][i].vote/fdat[f][i].voteavg)])
			}
		}
	}
	tdatlist.sort(function(a, b){return b.vote-a.vote});//Sorts tdatlist in order of top vote first.
	return tdatlist;
}

function changelist() //Update list based on map checkboxes
{
	autochange = document.getElementById('opt_topchange').checked;
	if(!autochange)
	{
		updatelist();
		return;
	}
	var e = document.getElementById("opt_topsel");
	var cc = 0;
	for (var b in daten)
	{
		if(daten[b])
		{
			cc += 1;
		}
	}
	if(cc == 1)
	{
		for (var b in daten)
		{
			if(daten[b])
			{
				e.selectedIndex = b;
			}
		}

	}
	if(cc > 1)
	{
		e.selectedIndex = e.length-1;
	}
	updatelist();
}

function getmID() //Get mIDs and generate options
{
	console.log('Getting mIDs');
	$.getJSON(mIDurl,function(mIDs)
	{
		var pack = document.getElementsByClassName('metric')[0];
		var options = document.getElementsByClassName('option')[0];
		options.innerHTML += 'Colors: ';
		for (var ind in mIDs)
		{
			//Selection options for toplist
			var opt = document.createElement('option');
			opt.value = ind;
			opt.innerHTML = mIDs[ind].metric.charAt(0).toUpperCase()+mIDs[ind].metric.substring(1);
			document.getElementById('opt_topsel').appendChild(opt);

			//Checkboxes for map TFX this will throw error if more categories
			var color = initcolors[ind];
			datmIDs.push(mIDs[ind].mID);
			daten.push(false);
			datcolors.push(color);

			var box = document.createElement('input');
			box.type = 'checkbox';
			box.id = "scheck"+ind.toString();
			
			var col = document.createElement('input');
			col.type = 'text';
			col.id = "opt_color"+ind.toString();
			
			pack.innerHTML += '<label>'+box.outerHTML+'<span>'+mIDs[ind].metric.charAt(0).toUpperCase()+mIDs[ind].metric.substring(1)+'</span></label><br>';
			options.innerHTML += col.outerHTML;
		}
		var opt = document.createElement('option');
		opt.value = -1;
		opt.innerHTML = 'Total';
		document.getElementById('opt_topsel').appendChild(opt);
		
		var pack = $(document.getElementsByClassName('option')[0]).children('label')[0];
		var box = document.createElement('input');
		box.type = 'checkbox';
		box.id = 'opt_topchange';
		pack.innerHTML += box.outerHTML+'<span>Automatic List Update</span>';

		var pack = $(document.getElementsByClassName('option')[0]).children('label')[1];
		var box = document.createElement('input');
		box.type = 'checkbox';
		box.id = 'opt_weighted';
		pack.innerHTML += box.outerHTML+'<span>Weighted Vote Total</span>';
		
		var pack = $(document.getElementsByClassName('option')[0]).children('label')[2];
		var box = document.createElement('input');
		box.type = 'checkbox';
		box.id = 'opt_circave';
		pack.innerHTML += box.outerHTML+'<span>Average Circle Colors</span>';
		
		var pack = $(document.getElementsByClassName('option')[0]).children('label')[3];
		var box = document.createElement('input');
		box.type = 'checkbox';
		box.id = 'opt_rorder';
		pack.innerHTML += box.outerHTML+'<span>Reverse Metric Order</span>';

		var pack = $(document.getElementsByClassName('option')[0]).children('label')[4];
		var box = document.createElement('input');
		box.type = 'checkbox';
		box.id = 'opt_lowmap';
		pack.innerHTML += box.outerHTML+'<span>Low-Res Map</span>';
		
		getdat();
		for (var ind in mIDs)
		{
			var box = document.getElementById("scheck"+ind.toString()).parentNode;
			box.onmouseover = function()
			{
				var x = $(this).children('input')[0];
				daten[x.id[x.id.length-1]] = true;
				changelist();
				mapit();
			};
			box.onmouseout = function()
			{
				update();
			};
			box.onclick = update;
			document.getElementById("opt_color"+ind.toString()).value = datcolors[ind];
			document.getElementById("opt_color"+ind.toString()).onchange = update;
		}
		$($(document.getElementsByClassName('option')[0]).children('label')[0]).children('input')[0].checked = autochange;
		$($(document.getElementsByClassName('option')[0]).children('label')[1]).children('input')[0].checked = weighted;
		$($(document.getElementsByClassName('option')[0]).children('label')[1]).children('input')[0].onclick = updatelist;
		$($(document.getElementsByClassName('option')[0]).children('label')[2]).children('input')[0].onclick = mapit;
		$($(document.getElementsByClassName('option')[0]).children('label')[3]).children('input')[0].onclick = mapit;
		$($(document.getElementsByClassName('option')[0]).children('label')[4]).children('input')[0].onclick = mapworld;
	})
}

function getdat() //Get data via recursion
{
	fdat = [];
	console.log('Getting Data');
	getidat(0);
}

function getidat(i) //Recursive function for getting data
{
	if(i >= datmIDs.length)
	{
		loaded = true;
		update();
		return;
	}
	//idat = {cID, ll, nll, vote, voteavg, loc_name, wiki_url, desc, image}
	var idat = [];
	//This url orders top first, because sort=1
	var idaturl = "https://www.qnt.io/api/results?pID=earth_tapestry&mID="+datmIDs[i]+"&limit="+datlim+"&skip=5&sort=1&key=54c67cc51c61be6e9acb1159";
	$.getJSON(idaturl,function(data)
	{
		var cc = 0;
		var voteavg = 0;
		for (var ind in data.results)
		{
			cc += 1;
			voteavg += data.results[ind].parameters.mu;
		}
		voteavg = Math.round(voteavg/cc);
		for (var ind in data.results)
		{
			var flist = {};
			flist.cID = data.results[ind].cID;
			flist.ll = data.results[ind].content_data.lat_long_alt.split(" ");
			flist.nll = lltoval(flist.ll);
			flist.vote = data.results[ind].parameters.mu;
			flist.voteavg = voteavg;
			flist.loc_name = data.results[ind].content_data.title;
			flist.wiki_url = data.results[ind].content_data.wikipedia_url;
			flist.desc = data.results[ind].content_data.description;
			flist.image = data.results[ind].content_data.image_name;
			idat.push(flist);
		}
		fdat.push(idat);
		getidat(i+1);
	})
}

function lltoval(ll) //Convert input latlon string to numerical latlon coords
{
	var latslice = ll[0].split(new RegExp(sep.join('|'), 'g'));
	var lat = 0;
	for (var i = 0; i < latslice.length-1; i++)
	{
		if(!isNaN(parseFloat(latslice[i])))
		{
			lat += parseFloat(latslice[i])/Math.pow(60,i);
		}
	}
	if(Math.abs(lat) == 90)
	{
		lat = lat*0.999999;
	}
	if(latslice[latslice.length-1] == 'S')
	{
		lat = -lat;
	}
	var lonslice = ll[1].split(new RegExp(sep.join('|'), 'g'));
	var lon = 0;;
	for (var i = 0; i < lonslice.length-1; i++)
	{
		if(!isNaN(parseFloat(lonslice[i])))
		{
			lon += parseFloat(lonslice[i])/Math.pow(60,i);
		}
	}
	if(lonslice[lonslice.length-1] == 'W')
	{
		lon = -lon;
	}
	return [lon,lat];
}

function colorave(cset)
{
	//colorset = [colors, mu]
	var fcolor = [0, 0, 0]
	var tmu = 0
	for (var c in cset)
	{
		tmu += cset[c][1]
	}
	for (var c in cset)
	{
		var rgbc = colorhextorgb(cset[c][0])
		fcolor[0] += rgbc[0]*cset[c][1]/tmu
		fcolor[1] += rgbc[1]*cset[c][1]/tmu
		fcolor[2] += rgbc[2]*cset[c][1]/tmu
	}
	return colorrgbtohex(fcolor[0],fcolor[1],fcolor[2]);
}

function cuthex(hex)
{
	if(hex.charAt(0) == "#")
	{
		return hex.substring(1,7);
	}
	else
	{
		return hex;
	}
}

function colorhextorgb(hex)
{
	return [parseInt((cuthex(hex)).substring(0,2),16),parseInt((cuthex(hex)).substring(2,4),16),parseInt((cuthex(hex)).substring(4,6),16)];
}

function colorrgbtohex(r, g, b)
{
	return "#"+((1 << 24)+(parseInt(r) << 16)+(parseInt(g) << 8)+parseInt(b)).toString(16).slice(1);
}

function move() //Move function for zoom
{
	var t = d3.event.translate,
	s = d3.event.scale;
	t[0] = Math.min(width/2 * (s - 1), Math.max(width/2 * (1 - s), t[0]));
	t[1] = Math.min(width/2 * (s - 1), Math.max(height/2 * (1 - s), t[1]));
	zoom.translate(t);
	g.style("stroke-width", 1 / s).attr("transform", "translate(" + t + ")scale(" + s + ")");
	updaterad();
	lastscale = zoom.scale();
	lasttrans = zoom.translate();
}

function mapworld() //Map land and countries
{
	var loc = '';
	if(document.getElementById('opt_lowmap') != null)
	{
		lowmap = document.getElementById('opt_lowmap').checked;
	}
	if(lowmap)
	{
		loc = "worldcountries.json.txt";
	}
	else
	{
		loc = "world-50m.json.txt";
	}
	d3.json(loc, function(error, topology)
	{
		g.selectAll("rect").remove();
		g.selectAll("path").remove();
		svg.selectAll("path").remove();

		g.append("rect")
			.attr("x", -width/2)
			.attr("y", -height/2)
			.attr("width", width)
			.attr("height", height)
			.attr("fill", "#F2E9D8");

		g.selectAll("path")
		.data(topojson.feature(topology, topology.objects.countries)
		.features).enter()
		.append("path")
		.attr("d", path)
		.attr("fill", "#70944D")
		.attr("stroke", "#212c17");

		// add lands from topojson
		svg.selectAll("path")
			.data(topojson.feature(topology, topology.objects.countries)
			.features).enter()
			.append("path")
			.attr("class", "feature")
			.attr("d", path)
		mapit();
	});
}

function mapit() //Update circles on map
{
	resetcircle();
	//fdat[x][i] = idat
	//idat = {cID, ll, nll, vote, voteavg, loc_name, wiki_url, desc, image}
	//tdatlist[i] = {cID, ll, nll, vote, tvoteavg, loc_name, wiki_url, desc, image, votesum, colorset}
	if(document.getElementById('opt_circave') != null)
	{
		circave = document.getElementById('opt_circave').checked;
	}
	if(circave)
	{
		updatetdatlist();
		for (var i in tdatlist)//For adding each circle. @ fdat[x][i] = idat
		{
			var ndat = tdatlist[i];
			g.data([ndat]).append("circle")//This adds the circle
			.attr("cx", projection(ndat.nll)[0])
			.attr("cy", projection(ndat.nll)[1])
			.attr("r", function(d)
			{
				return (datscale*Math.pow(d.vote/d.tvoteavg,datexp))/(Math.pow(zoom.scale(),0.5))+"px"
			})
			.attr("fill", function(d)
			{
				return colorave(d.colorset)
			})
			.attr("stroke", "black")
			.attr("opacity", 0.85)
			.on("mouseover", function(d)
			{
				ttdiv.transition().duration(200).style("opacity", 0.9)
				ttdiv.html('<a href="'+d.wiki_url+'" target="_blank">'+d.loc_name+'</a><img src="content/'+d.image+'" alt="'+d.loc_name+'" style="width:100px;height:100px;" align="right"><p>'+d.desc.substring(0,200)+'...</p>')
					.style("left", function(d)
					{
						if(d3.event.pageX < width-148)
						{
							return (d3.event.pageX+14)+'px'
						}
						else
						{
							return (d3.event.pageX-314)+'px'
						}
					})
					.style("top", function(d)
					{
						if(d3.event.pageY < height/2 + 24)
						{
							return (d3.event.pageY-28)+'px'
						}
						else
						{
							if(d3.event.pageY+32 > height+48)
							{
								return (d3.event.pageY-144)+'px'
							}
							return (d3.event.pageY-128)+'px'
						}
					})
					.on("mouseover", function(d)
					{
						if(this.style.opacity != 0)
						{
							ttdiv.transition().duration(200).style("opacity", 0.9)
						}
					})
					.on("mouseout", function(d)
					{
						ttdiv.transition().duration(600).style("opacity", 0)
						ttdiv.transition().delay(600).duration(0).style("left", '-1000px').style("top", '-1000px')
					})
			})
			.on("mouseout", function(d)
			{
				ttdiv.transition().duration(600).style("opacity", 0)
				ttdiv.transition().delay(600).duration(0).style("left", '-1000px').style("top", '-1000px')
			});
		}
	}
	else
	{
		for (var e in fdat)
		{
			rorder = document.getElementById('opt_rorder').checked;
			var f = (fdat.length-1)-e;
			if(rorder)
			{
				f = e;
			}
			if(daten[f])//If the fdat should be displayed
			{
				for (var i in fdat[f])//For adding each circle. @ fdat[x][i] = idat
				{
					var ndat = fdat[f][i];
					g.data([ndat]).append("circle")//This adds the circle
					.attr("cx", projection(ndat.nll)[0])
					.attr("cy", projection(ndat.nll)[1])
					.attr("r", function(d)
					{
						return (datscale*Math.pow(d.vote/d.voteavg,datexp))/Math.pow(zoom.scale(),0.5)+"px"
					})
					.attr("fill", datcolors[f])
					.attr("stroke", "black")
					.attr("opacity", 0.7)
					.on("mouseover", function(d)
					{
						ttdiv.transition().duration(200).style("opacity", 0.9)
						ttdiv.html('<a href="'+d.wiki_url+'" target="_blank">'+d.loc_name+'</a><img src="content/'+d.image+'" alt="'+d.loc_name+'" style="width:100px;height:100px;" align="right"><p>'+d.desc.substring(0,200)+'...</p>')
							.style("left", function(d)
							{
								if(d3.event.pageX < width-148)
								{
									return (d3.event.pageX+14)+'px'
								}
								else
								{
									return (d3.event.pageX-314)+'px'
								}
							})
							.style("top", function(d)
							{
								if(d3.event.pageY < height/2 + 24)
								{
									return (d3.event.pageY-28)+'px'
								}
								else
								{
									if(d3.event.pageY+32 > height+48)
									{
										return (d3.event.pageY-144)+'px'
									}
									return (d3.event.pageY-128)+'px'
								}
							})
							.on("mouseover", function(d)
							{
								if(this.style.opacity != 0)
								{
									ttdiv.transition().duration(200).style("opacity", 0.9)
								}
							})
							.on("mouseout", function(d)
							{
								ttdiv.transition().duration(600).style("opacity", 0)
								ttdiv.transition().delay(600).duration(0).style("left", '-1000px').style("top", '-1000px')
							})
					})
					.on("mouseout", function(d)
					{
						ttdiv.transition().duration(600).style("opacity", 0)
						ttdiv.transition().delay(600).duration(0).style("left", '-1000px').style("top", '-1000px')
					});
				}
			}
		}
	}
}