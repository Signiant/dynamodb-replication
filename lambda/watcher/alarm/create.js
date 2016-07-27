// Constants
var THRESHOLD = "{{delayThreshold}}";
var PERIOD = 60;
var EVALUATION_PERIODS = 5;
var SNS_TOPIC = "{{snsTopic}}";

// Depdendencies
var AWS = require('aws-sdk');
var cloudwatch = new AWS.CloudWatch({apiVersion: '2010-08-01'});

//  Handler function
exports.handler = function(event, context, callback){

  //Bind prefix to log levels
  console.log = console.log.bind(null, '[LOG]');
  console.info = console.info.bind(null, '[INFO]');
  console.warn = console.warn.bind(null, '[WARN]');
  console.error = console.error.bind(null, '[ERROR]');

  // Don't act unless request was successful
  if(event.detail.errorCode){
    console.warn("Request returned an error, event source failed to create");
    console.warn("No action taken");
    return callback();
  }

  var tableName = event.detail.requestParameters.eventSourceArn.split("/")[1];

  initMetric(tableName, function(err, data){
    if(err){
      console.error("Error initializing metric for table", tableName);
      console.error(err.code, "-", err.message);
      return callback(err);
    }

    createAlarm(tableName, function(err, data){
      if(err){
        console.error("Error creating alarm for table", tableName);
        console.error(err.code, "-", err.message);
      }

      callback(err, data);
    });
  });
};

// Pushes a datapoint to initialize the replication's MinutesBehindRecord custom metric
function initMetric(tableName, callback){
  var params = {
    Namespace: "Replication",
    MetricData: [
      {
        MetricName: "MinutesBehindRecord",
        Dimensions: [
          {
            Name: "TableName",
            Value: tableName
          }
        ],
        Timestamp: new Date(),
        Unit: "Count",
        Value: 0.0
      }
    ]
  };

  cloudwatch.putMetricData(params, callback);
}

// Creates an alarm for the new replication's MinutesBehindRecord metric
function createAlarm(tableName, callback){
  var params = {
    AlarmName: "Replication-" + tableName + "-MinutesBehindRecord",
    AlarmDescription: "Alarms when replication falls too far behind",
    Namespace: "Replication",
    MetricName: "MinutesBehindRecord",
    Dimensions: [
      {
        Name: "TableName",
        Value: tableName
      }
    ],
    Statistic: "Maximum",
    Unit: "Count",
    Period: PERIOD,
    EvaluationPeriods: EVALUATION_PERIODS,
    ComparisonOperator: "GreaterThanOrEqualToThreshold",
    Threshold: THRESHOLD,
    ActionsEnabled: true,
    AlarmActions: [
      SNS_TOPIC
    ]
  };

  cloudwatch.putMetricAlarm(params, callback);
}
