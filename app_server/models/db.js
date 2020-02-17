var mongoose = require('mongoose');

mongoose.Promise = require('bluebird');

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true)

var mongoDB = 'mongodb://****************:****************@****************/***********';

var connection = mongoose.connect(mongoDB,{ useNewUrlParser: true }, function(err, error){
    if(err){
        console.log('mongoose error: ' + err);
    }
    else{
        console.log('mongoose connected: ' + mongoDB);
    }
})

