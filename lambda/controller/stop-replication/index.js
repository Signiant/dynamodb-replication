// Dependencies
var AWS = require('aws-sdk');
var lambda = new AWS.Lambda({apiVersion: '2015-03-31'});

// Main handler function
exports.handler = function(event, context, callback){

  //Bind prefix to log levels
  console.log = console.log.bind(null, '[LOG]');
  console.info = console.info.bind(null, '[INFO]');
  console.warn = console.warn.bind(null, '[WARN]');
  console.error = console.error.bind(null, '[ERROR]');

  if(!event.record.UUID){
    console.warn("No UUID in event record, assuming event source was never created");
    return callback();
  }

  //Grab event source uuid from event
  var UUID = event.record.UUID.S;

  //Remove event source mapping
  lambda.deleteEventSourceMapping({ UUID : UUID }, function(err, data){
    if(err){
      if(err.code == "ResourceNotFoundException"){
        console.warn("EventSourceMapping not found, no replication to stop");
        console.warn("Marking COMPLETE");
        return callback();
      }else{
        console.error("Failed to delete event source mapping");
        console.error(err.code, "-", err.message);
        return callback(err);
      }
    }

    callback();
  });
};
