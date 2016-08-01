// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;


// Schme configurations
var userSchema = new Schema({
  name: String,
  fb_id: { type: String, require: true, unique: true },
  user_sign: { type: String, require: true },
  created_at: Date,
  updated_at: Date
});

var User = mongoose.model('User', userSchema);

userSchema.pre('update', function(next) {
  // get the current date
  var currentDate = new Date();

  // change the updated_at field to current date
  this.updated_at = currentDate;

  // if created_at doesn't exist, add to that field
  if (!this.created_at)
    this.created_at = currentDate;

  next();
});

var User = mongoose.model('User', userSchema);

module.exports = User;