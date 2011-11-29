var util      = require('util');
var path      = require('path');
var http      = require('http');
var httpProxy = require('http-proxy');
var paperboy  = require('paperboy');
var urlParse  = require('url').parse;

var WEBROOT   = path.dirname(__filename) + '/public';

var daemon = require('daemon');

var CONFIG = {
  lockFile:  path.join(__dirname, 'tmp', 'teuxdeux-mobile.pid'),
  logFile:   path.join(__dirname, 'tmp', 'teuxdeux-mobile.log'),
  port:      process.env.PORT || 8124,
  host:      process.env.HOST || '127.0.0.1'
};

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

function startServer() {
  var server = http.createServer(function (request, response) {
    var url = urlParse(request.url, true);
    var ip = request.connection.remoteAddress;

    if(url.pathname.match(/^\/teuxdeux/)) {
      console.log("Proxying request to TeuxDeux API: "+url.pathname);

      var proxy = new httpProxy.RoutingProxy();
      request.url = request.url.replace(/^\/teuxdeux/, "/api");

      if(isValidUrl(request.url))  {
        proxy.proxyRequest(request, response, {
          host: "teuxdeux.com",
          port: 443,
          https: true,
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
  }).listen(CONFIG.port, CONFIG.host);
}

var args = process.argv;

// Handle start stop commands
switch(args[2]) {
  case "stop":
    daemon.kill(CONFIG.lockFile, function (err, pid) {
      if (err) return util.log('Error stopping daemon: ' + err);
      util.log('Successfully stopped daemon with pid: ' + pid);
    });
    break;

  case "start":
    startServer();

    daemon.daemonize(CONFIG.logFile, CONFIG.lockFile, function (err, started) {
      if (err) {
        console.dir(err.stack);
        return util.log('Error starting daemon: ' + err);
      }
      util.log('Server running at http://'+CONFIG.host+':'+CONFIG.port+'/');
    });
    util.log('Successfully started daemon');
    break;

  default:
    util.log('Usage: [start|stop]');
    break;
}
