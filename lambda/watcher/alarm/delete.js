// Depdendencies
var AWS = require('aws-sdk');
var cloudwatch = new AWS.CloudWatch({apiVersion: '2010-08-01'});

// Handler function
exports.handler = function(event, context, callback){

  //Bind prefix to log levels
  console.log = console.log.bind(null, '[LOG]');
  console.info = console.info.bind(null, '[INFO]');
  console.warn = console.warn.bind(null, '[WARN]');
  console.error = console.error.bind(null, '[ERROR]');

  // Don't act unless request was successful
  if(event.detail.errorCode){
    console.warn("Request returned an error, event source failed to delete");
    console.warn("No action taken");
    return callback();
  }

  var tableName = event.detail.responseElements.eventSourceArn.split("/")[1];
  var alarmName = "Replication-" + tableName + "-MinutesBehindRecord";

  cloudwatch.deleteAlarms({ AlarmNames: [ alarmName ] }, function(err, data){
    if(err){
      console.error("Unable to delete alarm");
      console.error(err.code, "-", err.message);
    }

    callback(err);
  });
};
