var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');


var passport = require('passport');
var passportLocal = require('passport-local');
var passportHttp = require('passport-http');

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./sqlite.db');

var app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(expressSession({ 
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false 
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new passportLocal.Strategy(verifyCredentials));

passport.use(new passportHttp.BasicStrategy(verifyCredentials));

function verifyCredentials(username, password, done){

  db.all("SELECT rowid, * from user where username='"+username+"' and password='"+password+"'", function(err,rows){
    if(rows.length === 1){
      done(null, { id: rows[0].rowid, username: rows[0].username });
    } else {
      done(null, null);
    }
  }); 
}


passport.serializeUser(function(user, done){
  done(null, { id: user.id, name: user.username });
});

passport.deserializeUser(function(user, done){
  done(null, {id: user.id, name: user.name});
});

function ensureAuthenticated(req, res, next) {
  if(req.isAuthenticated()) {
    next();
  } else {
    res.redirect('/login');
  }
}

function ensureAuthenticatedHttp(req, res, next) {
  if(req.isAuthenticated()) {
    next();
  } else {
    res.send(403);
  }
}

function removeQuotes(theString){
  var toReturn = theString.replace("'", "");
  return toReturn.replace('"', '');
}

app.use(express.static('scripts'));

app.get('/', ensureAuthenticated, function(req, res) {

  db.all("SELECT rowid, user_id, name, (CAST(monies as FLOAT) / 100) as monies, (CAST(originalMonies as FLOAT) / 100) as originalMonies from envelope where user_id="+req.user.id, function(err,rows){

    res.render('index', {
        user: req.user,
        rows: rows
    });

  }); 

});

app.get('/login', function(req, res) {
    res.render('login');
});

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/login');
});

app.post('/login', passport.authenticate('local'), function(req, res){
  res.redirect('/');
});

app.post('/spend/add', ensureAuthenticated, function(req, res){

  var comment = removeQuotes(req.body.comment);
  if((req.body.startingAmount > 0) && Math.ceil((req.body.startingAmount * 100) - (req.body.amount)) > 0){
    var query1 = "INSERT into spend VALUES ('"+req.body.envelope+"', "+Math.ceil((req.body.amount))+", '"+comment+"')";
    db.run(query1);
    var subtToInt = Math.ceil((req.body.startingAmount * 100) - (req.body.amount));
    var query2 = "UPDATE envelope SET monies = "+ subtToInt + " WHERE rowid = " + req.body.envelope;
    db.run(query2);
    res.sendStatus(200);
  } else {
    res.sendStatus(204);
  }
  
});

app.post('/envelope/add', ensureAuthenticated, function(req, res){

  var name = removeQuotes(req.body.name);

  if(req.body.amount >= 0){

    var query = "SELECT count(rowid) as c FROM envelope where user_id = "+req.user.id+" and name = '"+name+"' COLLATE NOCASE";
    // Check to see if the envelope already exists for this user
    db.all(query, function(err, rows){
      if(rows[0].c === 0){
        // Add the envelope
        var query2 = "INSERT INTO envelope values("+req.user.id+", '"+name+"', "+(req.body.amount)+", "+(req.body.amount)+")";
        db.run(query2);
        res.sendStatus(200);
      } else {
        res.sendStatus(204);
      }
      
    });

  } else {
    res.sendStatus(204);
  }

  
});

app.post('/envelope/reset', ensureAuthenticated, function(req, res){

  if(req.body.amount >= 0){
    var query1 = "SELECT count(rowid) as c FROM envelope WHERE user_id = "+req.user.id+" and rowid = " + req.body.envelope;

    db.all(query1, function(err, rows){
      if(rows[0].c > 0){

        var query2 = "UPDATE envelope SET monies = "+req.body.amount+", originalMonies = "+req.body.amount+" WHERE rowid = "+req.body.envelope;
        db.run(query2);

        var query3 = "DELETE FROM spend where envelope_id = " + req.body.envelope;
        db.run(query3);
        res.sendStatus(200);
      } else {
        res.sendStatus(204);
      }
    });
    
  } else {
      res.sendStatus(204);
  }
});

app.get('/envelope/subtract', ensureAuthenticated, function(req, res){

  var query1 = "SELECT count(rowid) as c FROM envelope WHERE user_id = "+req.user.id+" and rowid = " + req.query.id;

  db.all(query1, function(err, rows){
    if(rows[0].c > 0){

      var query2 = "DELETE FROM envelope WHERE user_id = "+req.user.id+" and rowid = " + req.query.id;
      db.run(query2);

      var query3 = "DELETE FROM spend where envelope_id = " + req.query.id;
      db.run(query3);

      res.redirect('/');
    }
  });
  
});

app.get('/envelope', ensureAuthenticated, function(req, res){

  // Get the envelope and spends
   db.all("SELECT rowid, user_id, name, (CAST(monies as FLOAT) / 100) as monies, (CAST(originalMonies as FLOAT) / 100) as originalMonies from envelope where rowid="+req.query.id, function(err,rows){
    if(rows.length > 0){
      db.all("SELECT rowid, envelope_id, (CAST(amount as FLOAT) / 100) as amount, comment from spend where envelope_id="+rows[0].rowid+" order by rowid DESC", function(err2,rows2){
        res.render('envelope', {
            user: req.user,
            envelope: rows[0],
            rows: rows2
        });
      }); 
    }
   }); 

});

app.use('/api', passport.authenticate('basic', {session: false} ));

app.get('/api/data', ensureAuthenticatedHttp, function(req, res) {
  res.json([
    {value: 'value'}
  ]);
});

var port = process.env.PORT || 1337;

app.listen(port, function(){
    console.log('http://127.0.0.1:' + port + '/');
});
