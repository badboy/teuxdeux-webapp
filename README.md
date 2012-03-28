# TeuxDeux Webapp

A small single-page web app, so you can easily view/edit/update your [TeuxDeux][] list on small screens like on smartphones.

![web app](http://files.expertura.de/pub/2011-05-29-teuxdeux-mobile-webapp-working.png)

## Why?

The default [TeuxDeux][] page is unusable on small smartphone screens.

So now that I've got the [API documentation][apiwiki] I created this thing.

## How?

It's just a simple node.js webserver proxying all API requests and serving the index.html and app.js (daemonized by default).


## And now?

    npm install

and

    node server.js start

It's that simple (Or use `node server.js nodaemon` to start in foreground).



[teuxdeux]: http://teuxdeux.com/
[apiwiki]: https://github.com/badboy/teuxdeux/wiki/API
