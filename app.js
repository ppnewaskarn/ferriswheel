var http        = require('http');
var IMDBCrawler = require("./crawler");
var url         = require('url');
var querystring = require('querystring');
var open        = require("open");
var fs          = require('fs');

let crawler = new IMDBCrawler();

// Some times IMDB.com reset the connection 
// Node does not handle this gracefully. 
process.on('uncaughtException', function (err) {
  console.error(err.stack);
  console.log("Node NOT Exiting...");
});

console.log("Starting to crawl data, it should take about 30 Seconds..");
// initiate the crawl
crawler.crawl(function(){
	console.log("Done! Starting Server..");
	StartServer();
});


// Start Web Server
function StartServer()
{
	http.createServer(function (request, response) 
	{
	    
	    var pathName = url.parse(request.url).pathname;
	    var query = url.parse(request.url).query;
        
        // Handle Ajax search request
	    if(pathName == "/search")
	    {
	    	response.writeHead(200, {'Content-Type': 'text/plain'});
	    	var searchString = querystring.parse(query).q;
	    	// perform search and respond. 
	        response.end(JSON.stringify(crawler.search(searchString)));
	    }
	    else
	    {   // respond with index page. 
	    	fs.readFile("./index.html", function(err, data)
	    	{
				if(err)
				{
				  	response.writeHead(404, {'Content-type':'text/plan'});
					response.end('Page Was Not Found');
				}
				else
				{
					response.writeHead(200, {'Content-Type': 'text/html'});
	                response.end(data);
				}
		    });
	    }
	}).listen(8080);

	console.log('Server started');
    open("http://localhost:8080");
}

