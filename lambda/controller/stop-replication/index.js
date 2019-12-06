// Dependencies
var AWS = require('aws-sdk');
var lambda = new AWS.Lambda({apiVersion: '2015-03-31'});

const levelLogger = {
    log: (...args) => console.log( '[LOG]', ...args),
    info: (...args) => console.log( '[INFO]', ...args),
    warn: (...args) => console.log( '[WARN]', ...args),
    error: (...args) => console.log( '[ERROR]', ...args),
};

// Main handler function
exports.handler = function(event, context, callback){

  if(!event.record.UUID){
    levelLogger.warn("No UUID in event record, assuming event source was never created");
    return callback();
  }

  //Grab event source uuid from event
  var UUID = event.record.UUID.S;

  //Remove event source mapping
  lambda.deleteEventSourceMapping({ UUID : UUID }, function(err, data){
    if(err){
      if(err.code == "ResourceNotFoundException"){
        levelLogger.warn("EventSourceMapping not found, no replication to stop");
        levelLogger.warn("Marking COMPLETE");
        return callback();
      }else{
        levelLogger.error("Failed to delete event source mapping");
        levelLogger.error(err.code, "-", err.message);
        return callback(err);
      }
    }

    callback();
  });
};
