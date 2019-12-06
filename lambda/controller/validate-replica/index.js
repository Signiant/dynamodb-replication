// Constants
var REPLICA_REGION = "{{replicaRegion}}";

// Dependencies
var AWS = require('aws-sdk');
var replicadb = new AWS.DynamoDB({apiVersion: '2012-08-10', region: REPLICA_REGION});

const levelLogger = {
    log: (...args) => console.log( '[LOG]', ...args),
    info: (...args) => console.log( '[INFO]', ...args),
    warn: (...args) => console.log( '[WARN]', ...args),
    error: (...args) => console.log( '[ERROR]', ...args),
};

// Main handler function
exports.handler = function(event, context, callback){

  //Verify keySchema exists in event record
  if(!event.record.keySchema){
    levelLogger.error("keySchema property missing from event record");
    return callback(new Error("Invalid Event Record - keySchema property missing from event record"));
  }

  var table = event.table;
  var keySchema = event.record.keySchema.S;

  replicadb.describeTable({ TableName: table }, function(err, data){
    if(err){
      if (err.code === 'ResourceNotFoundException') {
        //Replica Table doesnt exist, create it
        levelLogger.log("No replica table found");
        return callback(null, {stateMessage: "No replica table found"});
      }else{
        levelLogger.error("Unable to describe table");
        levelLogger.error(err.code, "-", err.message);
        return callback(err);
      }
    }

    if(JSON.stringify(data.Table.KeySchema) != keySchema){
      //Source and replica key schemas do not match, fail
      levelLogger.error("KeySchema on replica does not match that of source");
      return callback(new Error("Source and Replica tables must have the same KeySchema"));
    }

    //Valid replica table exists, skip CREATE_REPLICA, go straight to START_REPLICATION
    var returnData = {
      step: "START_REPLICATION",
      state: 'PENDING',
      stateMessage: 'Valid replica table found, initializing replication'
    };

    callback(null, returnData);
  });
};
