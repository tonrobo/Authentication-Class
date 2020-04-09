//jshint esversion:6
require('dotenv').config() // This environment variable MUST BE AT THE TOP!
//Also angela had a full stop at the end of hers, I did not so I didn't include the period.
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption"); Level 2 Security
// const md5 = require('md5'); : Level 3 Security
const bcrypt = require("bcrypt"); // Level 4 Security
const saltRounds = 10; // 10 rounds is good for 2019-2020


const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));

mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true,
useUnifiedTopology: true});

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});


//userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });
// ********* It is very important to create the schema, the secret string and plug it into the userSchema BEFORE creating the user model. **************

const User = new mongoose.model("User", userSchema);


app.get("/", function(req, res){
  res.render("home");
});

app.get("/login", function(req, res){
  res.render("login");
});



app.get("/register", function(req, res){
  res.render("register");
});

app.post("/register", function(req, res){
  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    // Store hash in your password DB.
    const newUser = new User({
      email: req.body.username,
      password: hash
    });
    // save new Users
    newUser.save(function(err){ //Automagically, Mongoose Encrypt is encrypting the password on Save
      if(err){
        console.log(err);
      } else {
        res.render("secrets"); //Notice we only give the Secrets route from within the register route.
      }
    });
  });
  //add a new document ( a new User) to the Collection of Users modeled with the Schema.

});

app.post("/login", function(req, res){

  const username = req.body.username;
  const password = req.body.password;
  User.findOne({email: username}, function(err, foundUser){ //Automagically, Mongoose Encrypt is descrypting when we call Find.
    if (err){
      console.log(err); //res.render("register");
    } else {
      if (foundUser){
        bcrypt.compare(password, foundUser.password, function(err, result) {
            // result == true
            if (result === true) {
                res.render("secrets");
            }
        });
        res.render("register");
      }
    }
  });
});




app.listen(3000, function(){
  console.log("Server is starting on port 3000.")
});
