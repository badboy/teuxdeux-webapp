var sys       = require('sys');
var path      = require('path');
var http      = require('http');
var httpProxy = require('http-proxy');
var paperboy  = require('paperboy');
var urlParse  = require('url').parse;

var WEBROOT    = path.dirname(__filename) + '/public';

/* paperboy log method */
function log(statCode, url, ip, err) {
  var logStr = statCode + ' - ' + url + ' - ' + ip;
  if (err)
    logStr += ' - ' + err;
  console.log(logStr);
}

VALID_TEUXDEUX_URLS = [
  "/api/user.json",
  "/api/list.json",
  "/api/list/someday.json",
  "/api/todo.json",
  "/api/update.json",
  "/api/todo/",
]

function isValidUrl(url) {
  var found = false;
  for(id in VALID_TEUXDEUX_URLS) {
    if(url.indexOf(VALID_TEUXDEUX_URLS[id]) == 0) {
      found = true;
      break;
    }
  }
  return found;
}

var server = http.createServer(function (request, response) {
  var url = urlParse(request.url, true);
  var ip = request.connection.remoteAddress;


  if(url.pathname.match(/^\/teuxdeux/)) {
    console.log("Proxying request to TeuxDeux API: "+url.pathname);
    //console.log(request);

    var proxy = new httpProxy.HttpProxy();
    request.url = request.url.replace(/^\/teuxdeux/, "/api");
    var buffer = proxy.buffer(request);

    if(isValidUrl(request.url))  {
      proxy.proxyRequest(request, response, {
        host: "teuxdeux.com",
        port: 443,
        https: true,
        buffer: buffer
      });
    } else {
      response.writeHead(403, {'Content-Type': 'text/plain'});
      response.end("Proxying denied.");
      console.log("  Proxying denied.");
    }
  } else {
    paperboy
    .deliver(WEBROOT, request, response)
    .after(function(statCode) {
      log(statCode, request.url, ip);
    })
    .error(function(statCode, msg) {
      response.writeHead(statCode, {'Content-Type': 'text/plain'});
      response.end("Error " + statCode);
      log(statCode, request.url, ip, msg);
    })
    .otherwise(function(err) {
      response.writeHead(404, {'Content-Type': 'text/plain'});
      response.end("Error 404: File not found");
      log(404, request.url, ip, err);
    });
  }
}).listen(2000);
console.log("= Server listening on http://localhost:2000");
