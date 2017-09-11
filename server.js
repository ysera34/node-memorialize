var express = require('express');
// formidable = require('formidable');
var appdata = require('./data/appdata.js');
var pool = require('./configs/connector.js');

var app = express();

// set up handlebars view engine
var handlebars = require('express-handlebars').create({
  defaultLayout: 'main',
  helpers: {
    section: function(name, options) {
      if (!this._sections) this._sections = {};
      this._sections[name] = options.fn(this);
      return null;
    }
  }
});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);

app.use(express.static(__dirname + '/public'));
// app.use(require('body-parser')());

app.use(function(req, res, next) {
  if (!res.locals.partials) res.locals.partials = {};
  res.locals.partials.menuContext = appdata.getNavMenu();
  next();
});

app.get('/', function(req, res) {
  res.render('home');
});

app.get('/users', function(req, res) {

  var users = [];
  pool.getConnection(function(err, connection) {
    connection.query('SELECT id, name, phone, email, alive FROM users', function(error, results, fields) {
      connection.release();

      if (error) console.error(error);
      users = {
        message: "success",
        counted: results.length,
        data: results,
      };
      res.render('users', {
        users: users
      });
    });
  });
});

app.get('/obituary', function(req, res) {
  res.render('obituary');
});

app.get('/sms', function(req, res) {
  res.render('sms');
});

// 404 catch-all handler (middleware)
app.use(function(req, res, next) {
  res.status(404);
  res.render('404');
});

// 500 error handler (middleware)
app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500);
  res.render('500');
});

app.listen(app.get('port'), function() {
  console.log('Express started on http://localhost:' +
    app.get('port') + '; press Ctrl-C to terminate.');
});
