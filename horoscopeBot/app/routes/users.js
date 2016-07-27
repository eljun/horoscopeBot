var express = require('express');
var User         = require('../model/user');
var mongoose     = require('mongoose');
var router = express.Router();


/* GET users listing. */
// router.get('/', function(req, res, next) {
//   res.send('respond with a resource');
// });

router.get('/', function(req, res){
  var usermap  = {};
  User.find({}, function(err, users) {
    users.forEach(function(user){
      usermap = users;
    });
    res.send(usermap);
  });
});

module.exports = router;
