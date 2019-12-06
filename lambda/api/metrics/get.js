// Dependencies
var AWS = require('aws-sdk');
var cloudwatch = new AWS.CloudWatch({apiVersion: "2010-08-01"});

const levelLogger = {
    log: (...args) => console.log( '[LOG]', ...args),
    info: (...args) => console.log( '[INFO]', ...args),
    warn: (...args) => console.log( '[WARN]', ...args),
    error: (...args) => console.log( '[ERROR]', ...args),
};

// Main handler function
exports.handler = function(event, context, callback) {

  var namespace = event.namespace;
  var metric = event.metric;
  var dimension = event.dimension;

  //Span vs count?
  var count = event.count;
  var period = event.period;
  var span = period * count;
  var unit = event.unit;
  var statistic = event.statistic;
  var endTime = new Date();
  var startTime = new Date(endTime);
  startTime.setSeconds(startTime.getSeconds() - span);

  var params = {
    StartTime: startTime,
    EndTime: endTime,
    MetricName: metric,
    Namespace: namespace,
    Period: period,
    Statistics: [ statistic ],
    Unit: unit
  };

  if(dimension) {
    params.Dimensions = [
      {
        Name: 'TableName',
        Value: dimension
      }
    ]
  }
  
  cloudwatch.getMetricStatistics(params, function(err, data){
    if(err){
      levelLogger.error("Unable to get metric statistics");
      levelLogger.error(err.name, "-", err.message);
      callback(err);
    }else {
      callback(null, data);
    }
  });
};