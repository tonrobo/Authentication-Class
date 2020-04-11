//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const FacebookStrategy = require('passport-facebook').Strategy;

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
  secret: 'Our little secret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true,
useUnifiedTopology: true});

mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  givenName: String,
  facebookId: String,
  facebookName: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User", userSchema);



passport.use(User.createStrategy());
// The below serialization and deserializaton was created by Passport Local mongoose so it was ONLY LOCal. Now that we are authenicating with Google (or Facebook or Twitter), we need a strategy that will work for any authenication.
//passport.serializeUser(User.serializeUser()); //passportLocalMongoose
//passport.deserializeUser(User.deserializeUser()); //passportLocalMongoose

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// We put Google after all of the passport set up and right before all of the routes.
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  //findOrCreate is passport pseudo code—they are telling you to use a Find (findMany or findOne, etc.) or to use a create menthod - so you need to replace this. However, there is also an NPM package called findOrCreate for Mongoose that you can install and make this a workable(?) function/method. https://www.npmjs.com/package/mongoose-findorcreate
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id, givenName: profile.name.givenName  },       function (err, user) {
      return cb(err, user);
    });
  }
));

//Facebook
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets",
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ facebookId: profile.id, facebookName: profile.displayName }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
  res.render("home");
});

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", function(req, res){ // Now, Angela wants anyone (logged in or not to be ablet to see this page.)
  User.find({ "secret": {$ne: null} }, function(err, foundUsers){
    if (err) {
      console.log(err);
    } else {
      if(foundUsers){
        res.render( "secrets", { usersWithSecrets: foundUsers } );
      }
    }
  });
});

app.get("/submit", function(req, res){
  if (req.isAuthenticated()) {
    res.render("submit")
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", function(req, res){
  req.logout();
  console.log(req.user);
  res.redirect("/");
});

// Google: After providing form submitts for the front end, we set up the routes for google authenication requests. See Passport Google OAuth 20. Remember the Google Profile contains the email and google user id which is all we need for our purpose. This code should bring up a pop up that allows the user to sign into google.
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);
// Now add a app.get on your site to save session info and rount to the secrets page. Otherwise your error will be: Cannot GET /auth/google/secrets

// My Secrets site:
app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

// Facebook:
app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.post("/register", function(req, res){
  User.register({ username: req.body.username }, req.body.password, function(err, user) {
    if (err){
      //console.log(err);
      res.redirect('/register');
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });
});

app.post("/login", function(req, res){
 const user = new User({
   username: req.body.username,
   password: req.body.password
 });
 req.login(user, function(err){
   if (err) {
     console.log(err);
   } else {
     passport.authenticate("local")(req, res, function(){
       res.redirect("/secrets");
     })
   }
 })
});

app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;
  User.findById(req.user.id, function(err, foundUser){
    if (err) {
      console.log(err);
    } else {
      if(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });
});
app.listen(3000, function(){
  console.log("Server is starting on port 3000.")
});
