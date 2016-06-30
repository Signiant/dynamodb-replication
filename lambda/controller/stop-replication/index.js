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
    console.error("Error - no UUID in event record");
    return callback(new Error("Invalid Event Record - UUID property missing from event record"));
  }

  var UUID = event.record.UUID.S;

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
