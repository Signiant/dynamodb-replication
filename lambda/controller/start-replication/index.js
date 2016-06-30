// Constants
var STARTING_POSITION = 'TRIM_HORIZON';
var BATCH_SIZE = 25;

// Dependencies
var AWS = require('aws-sdk');
var lambda = new AWS.Lambda({apiVersion: '2015-03-31'});

// Main handler function
exports.handler = function(event, context, callback) {

  //Bind prefix to log levels
  console.log = console.log.bind(null, '[LOG]');
  console.info = console.info.bind(null, '[INFO]');
  console.warn = console.warn.bind(null, '[WARN]');
  console.error = console.error.bind(null, '[ERROR]');

  //Verify initialStreamArn exists in event record
  if (!event.record.initialStreamArn) {
    console.error("Error - no streamArn provided in event record");
    return callback(new Error("Invalid Event Record - streamArn property missing from event record"));
  }

  var params = {
    EventSourceArn: event.record.initialStreamArn.S,
    FunctionName: event.replicator,
    StartingPosition: STARTING_POSITION,
    BatchSize: BATCH_SIZE,
    Enabled: true
  };

  //Add event source to replicator function
  lambda.createEventSourceMapping(params, function (err, data) {
    if (err) {
      console.error(err.code, "-", err.message);
      console.error("Unable to create event source mapping for lambda function");
      return callback(err);
    }

    //Success, replication is now active
    var response = {
      state: "ACTIVE",
      step: "REPLICATING",
      stateMessage: "Succesfully started replication",
      UUID: data.UUID
    };

    callback(null, response);

  });
};
