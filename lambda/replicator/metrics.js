//Constants
var NAMESPACE = 'Replication';

// Dependencies
var zlib = require('zlib');
var AWS = require('aws-sdk');
var cloudwatch = new AWS.CloudWatch({apiVersion: '2010-08-01'});

// Handler function
exports.handler = function(event, context, callback) {
  //Unzip and parse payload
  var payload = new Buffer(event.awslogs.data, 'base64');
  zlib.gunzip(payload, function (err, result) {
    if (err) {
      console.error("Unable to unzip event");
      return callback(err);
    }

    result = JSON.parse(result.toString('utf8'));

    //Process parsed metrics
    processMetrics(result, callback);
  });
};

function processMetrics(event, callback){
  //Construct putMetricData request object
  var metricData = event.logEvents.reduce(function (metricData, logEvent) {
    var fields = logEvent.extractedFields;

    if (fields.level === "TOTAL" || fields.level === "ALL")
      metricData.push(new MetricDatum(fields.name, fields.value));

    if (fields.level === "TABLE" || fields.level === "ALL")
      metricData.push(new MetricDatum(fields.name, fields.value, fields.table));

    return metricData;
  }, []);

  //Split metrics into groups of 20
  var metricGroups = [];
  while (metricData.length) {
    metricGroups.push(metricData.splice(0, 20));
  }

  //Post metric data for each group
  metricGroups.forEach(function (metricGroup) {
    var params = {
      Namespace: NAMESPACE,
      MetricData: metricGroup
    };
    cloudwatch.putMetricData(params, function (err, data) {
      if (err) {
        console.error("Unable to write metric data to cloudwatch");
        console.error(err.name, "-", err.message);
        console.error("Failed metric data:", JSON.stringify(metricGroup));
      }
    });
  });
  callback();
}

// Metric Datum Object Constructor
function MetricDatum(name, value, table){
  this.MetricName = name;
  this.Value = value;
  this.Unit = "Count";

  if(table)
    this.Dimensions = [
      {
        Name: "TableName",
        Value: table
      }
    ]
}
