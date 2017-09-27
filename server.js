var express = require('express');
// formidable = require('formidable');
var asy = require('async');
var appdata = require('./data/appdata.js');
var pool = require('./configs/connector.js');
var multer = require('multer');
var path = require('path');
// var upload = multer({ dest: 'uploads/' });
// var upload = multer({dest: 'uploads/', limits: {fileSize:3000000}});

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
app.use(express.static(__dirname + '/uploads'));
app.use(require('body-parser').json());
app.use(require('body-parser').urlencoded({extended:false}));

var upload = function(req, res, imageKey, callback) {
  var storage = multer.diskStorage({
    destination: function(req, file, callback) {
      callback(null, 'uploads/');
    },
    filename: function(req, file, callback) {
      console.log(file);
      file.uploadedFile = {
        name: file.fieldname + '-' + Date.now(),
        // ext: file.mimetype.split('/')[1],
        ext: path.extname(file.originalname),
      };
      callback(null, file.uploadedFile.name + file.uploadedFile.ext);
    },
  });
  var upload = multer({ storage: storage}).single(imageKey);
  upload(req, res, function(err) {
    if (err) {
      console.error(err);
      return callback(err, null);
    } else {
      callback(null, req.file.filename);
    }
  });
};

app.use(function(req, res, next) {
  if (!res.locals.partials) res.locals.partials = {};
  res.locals.partials.menuContext = appdata.getNavMenu();
  next();
});

app.get('/', function(req, res) {
  res.render('home');
});

app.get('/api/users/:id', function(req, res) {
  var userId = req.params.id;
  var user;
  pool.getConnection(function(err, connection) {
    var query = 'SELECT id, name, birth, phone, email, imagepath, alive, gender, school,' +
    ' company, society, lastwill FROM users where id = ?';
    connection.query(query, [userId], function(error, results, fields) {
      connection.release();

      if (error) console.error(error);
      user = results[0];
      var result = {
        message: "success",
        data: user,
      };
      res.json(result);
    });
  });
});

// callback(error, data1, data2, data3, callback)

app.post('/api/users/signup', function(req, res, next) {
    var params = {
      phone:req.body.phone,
      email:req.body.email,
      password:req.body.password,
    };
    var user;
    pool.getConnection(function(err, conn) {
      if (err) return next(err);

      conn.beginTransaction(function(err) {
        if (err) {
          conn.release();
          return callback(err);
        }

        asy.waterfall([function(callback) {
          var query = "insert into users set ?";
          conn.query(query, [params], function(error, results, fields) {
            if (error) return callback(error);
            callback(null);
          });
        } , function(callback) {
            var query = "select * from users where email = ?";
            conn.query(query, [params.email], function(error, results) {
              if (error) return callback(error, null);

              user = results[0];
              var result = {
                message: "success",
                data: user,
              };

              callback(null, result);
            });
          }], function(ERROR, RESULT) {
            var result = RESULT;
            if (ERROR) {
              return conn.rollback(function() {
                conn.release();
                callback(ERROR);
              });
            }
            conn.commit(function(error) {
              if (error) {
                return conn.rollback(function() {
                  conn.release();
                  callback(error);
                });
              }
              conn.release();
              res.json(result);
            });
          });
      });
    });
  });

app.post('/api/users/signin', function(req, res, next) {
  var params = {
    email:req.body.email,
    password:req.body.password,
  };
  var user;
  pool.getConnection(function(err, conn) {
    if (err) return next(err);
    asy.waterfall([function(callback) {
        var query = "select * from users where email = ? and password = ?";
        conn.query(query, [params.email, params.password], function(error, results) {
          if (error) return callback(error);
          user = results[0];
          callback(null);
        });
    }], function(ERROR, RESULT) {
      conn.release();
      if (ERROR) return next(ERROR);
      var result;
      if (user == null) {
        result = {
          message: "fail",
        };
      } else {
        result = {
          message: "success",
          data: user,
        };
      }
      return res.json(result);
    });
  });
});

app.post('/api/users/altar', function(req, res, next) {

  var user;
  pool.getConnection(function(err, conn) {
    if (err) return next(err);

    conn.beginTransaction(function(err) {
      if (err) {
        conn.release();
        return next(err);
      }

      asy.waterfall([function(callback) {
        upload(req, res, 'userimage', callback);

      }, function(filename, callback) {
        var query = "update users set ? where email = ?";
        var params = {
          name: req.body.name,
          birth: req.body.birth,
          imagepath: filename,
          gender: req.body.gender,
          school: req.body.school,
          company: req.body.company,
          society: req.body.society,
          lastwill: req.body.lastwill,
          bank: req.body.bank,
        };
        conn.query(query, [params, req.body.email], function(error, results) {
          if (error) return callback(error);
          callback(null);
        });
      }, function(callback) {
          var query = "select * from users where email = ?";
          conn.query(query, [req.body.email], function(error, results) {
            if (error) return callback(error);

            user = results[0];
            var result = {
              message: "success",
              data: user,
            };

            callback(null, result);
          });
        }], function(ERROR, RESULT) {
          var result = RESULT;
          if (ERROR) {
            return conn.rollback(function() {
              conn.release();
              next(ERROR);
            });
          }
          conn.commit(function(error) {
            if (error) {
              return conn.rollback(function() {
                conn.release();
                next(error);
              });
            }
            conn.release();
            res.json(result);
          });
        });
    });
  });
});

app.post('/api/obituary', function(req, res, next) {

  pool.getConnection(function(err, conn) {
    if (err) return next(err);

    conn.beginTransaction(function(err) {
      if (err) {
        conn.release();
        return next(err);
      }

      asy.waterfall([function(callback) {
        upload(req, res, 'obituaryimage', callback);

      }, function(filename, callback) {
        var query = "insert into obituaries set ?";
        var params = {
          sender: decodeURIComponent(req.body.sender),
          recipient: req.body.recipient,
          relations: req.body.relations,
          contacts: req.body.contacts,
          imagepath: filename,
        };
        conn.query(query, [params], function(error, results) {
          if (error) return callback(error);
          var result = {
            message: "success",
          };
          callback(null, result);
        });

      }], function(ERROR, RESULT) {
        var result = RESULT;
        if (ERROR) {
          return conn.rollback(function() {
            conn.release();
            next(ERROR);
          });
        }
        conn.commit(function(err) {
          if (err) {
            return conn.rollback(function() {
              conn.release();
              next(error);
            });
          }
          conn.release();
          res.json(result);
        });
      });
    });
  });
});

app.get('/users', function(req, res) {

  var users = [];
  pool.getConnection(function(err, connection) {
    connection.query('SELECT id, name, phone, email, alive FROM users', function(error, results, fields) {
      connection.release();

      if (error) {
        console.error(error);
        next(error);
      }
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

app.get('/users/:id', function(req, res) {
  var userId = req.params.id;
  var user;
  pool.getConnection(function(err, connection) {
    var query = 'SELECT id, name, phone, email, imagepath, alive, gender, school,' +
    ' company, society, lastwill, bank FROM users where id = ?';
    connection.query(query, [userId], function(error, results, fields) {
      connection.release();

      if (error) console.error(error);
      user = {
        message: "success",
        data: results[0],
      };
      res.render('user', {
        user: user
      });
    });
  });
});

app.get('/obituaries', function(req, res) {

  var obituaries = [];
  var query = "select id, sender, recipient, relations, contacts, imagepath from obituaries order by id desc";
  pool.getConnection(function(err, conn) {
    conn.query(query, function(error, results, fields) {
      conn.release();

      if (error) {
        console.error(error);
        next(error);
      }
      obituaries = {
        message: "success",
        counted: results.length,
        data: results,
      };
      res.render('obituaries', {
        obituaries: obituaries
      });
    });
  });
});

app.get('/obituaries/:id', function(req, res) {
  var obituaryId = req.params.id;
  var obituary;
  pool.getConnection(function(err, connection) {
    var query = 'SELECT name, birth, imagepath from users where name = ' +
    '(select recipient from obituaries where id = ?);';
    connection.query(query, [obituaryId], function(error, results, fields) {
      connection.release();

      if (error) console.error(error);
      obituary = {
        message: "success",
        data: results[0],
      };
      res.render('obituary', {
        layout: false,
        obituary: obituary,
      });
    });
  });
});

app.get('/qna', function(req, res) {
  res.render('qna');
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

app.listen(5000, function() {
  console.log('Express started on http://localhost:' +
    app.get('port') + '; press Ctrl-C to terminate.');
});

// var storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, '/tmp/my-uploads');
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.fieldname + '-' + Date.now());
//   }
// });
//
// var upload = multer({ storage: storage });
