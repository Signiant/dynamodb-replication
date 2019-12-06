// Depdendencies
var AWS = require('aws-sdk');
var cloudwatch = new AWS.CloudWatch({apiVersion: '2010-08-01'});

const { levelLogger } = require('../../logger');

// Handler function
exports.handler = function(event, context, callback){

  // Don't act unless request was successful
  if(event.detail.errorCode){
    levelLogger.warn("Request returned an error, event source failed to delete");
    levelLogger.warn("No action taken");
    return callback();
  }

  var tableName = event.detail.responseElements.eventSourceArn.split("/")[1];
  var alarmName = "Replication-" + tableName + "-MinutesBehindRecord";

  cloudwatch.deleteAlarms({ AlarmNames: [ alarmName ] }, function(err, data){
    if(err){
      levelLogger.error("Unable to delete alarm");
      levelLogger.error(err.code, "-", err.message);
    }

    callback(err);
  });
};
