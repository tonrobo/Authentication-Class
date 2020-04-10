//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session'); // 1
const passport = require("passport"); // 2
const passportLocalMongoose = require("passport-local-mongoose"); // 3

// -m "Delete bcrypt and saltsRounds. Set up passport and session to handel all the hashing, salting and aunthenication. Fix the deprecated collection.ensureIndex warning by setting the UseCreateIndex in mongoose to true."

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({  // 4
  secret: 'Our little secret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());  // 5
app.use(passport.session()); // 6

mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true,
useUnifiedTopology: true});

mongoose.set('useCreateIndex', true); // 7 - Wasn't getting this error until plugin

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

userSchema.plugin(passportLocalMongoose); // 8

const User = new mongoose.model("User", userSchema);

//https://www.npmjs.com/package/passport-local-mongoose#simplified-passportpassport-local-configuration
// CHANGE: USE "createStrategy" INSTEAD OF "authenticate"
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser()); // refer to sessions
passport.deserializeUser(User.deserializeUser()); // refer to sessions


app.get("/", function(req, res){
  res.render("home");
});

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", function(req, res){
  if (req.isAuthenticated()) {
    res.render("secrets")
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", function(req, res){
  req.logout();
  console.log(req.user);
  res.redirect("/");
});

app.post("/register", function(req, res){
// 1. retrieve the username (email) and Password
// 2. store the new userDB in an obj to send
// 3. save it in mongoose mongodb
// Now we are using passport-local-mongoose package, the register method included does all creating a new user, saving them and interacting on our behalf for authenication. Passport-local-mongoose is the Middleman.
  User.register({ username: req.body.username }, req.body.password, function(err, user) {
    if (err){
      console.log(err);
      res.redirect('/register');
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });
});

app.post("/login", function(req, res){
// retrieve the username and password.
// compare the password against the password we have
// direct you to the secret page or tell user they forgot their password
 const user = new User({
   username: req.body.username,
   password: req.body.password
 }); //in order to work with the .login method on the req, we need to create a user from the mongoose model that passes in the values from the Log In form for authentication against a registered user. see http://www.passportjs.org/docs/login/
 req.login(user, function(err){
   if (err) {
     console.log(err);
   } else {
     passport.authenticate("local")(req, res, function(){
       res.redirect("/secrets");
       console.log(req.user);
     })
   }
 })
});





app.listen(3000, function(){
  console.log("Server is starting on port 3000.")
});
