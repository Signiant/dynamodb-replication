//  Constants
var REPLICA_REGION = "{{replicaRegion}}";
var DELAY = [ 100, 200, 400, 800, 1600, 3200 ];
var MAX_DELAY_INDEX = 5;
var TIMEOUT_PADDING_MS = 2000;
var RETRYABLE = [ "ProvisionedThroughputExceededException", "InternalServerError", "ServiceUnavailable" ];

// Dependencies
var AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10', region: REPLICA_REGION});

//  Handler function
exports.handler = function(event, context, callback){

  //Pull table name from event source arn
  var tableName = event.Records[0].eventSourceARN.split('/')[1];

 //Prefix metrics with metric level and table name
  console.metric = {
    all: console.log.bind(null, '[METRIC]', '[' + tableName + ']', 'ALL'),
    table: console.log.bind(null, '[METRIC]', '[' + tableName + ']', 'TABLE'),
    total: console.log.bind(null, '[METRIC]', '[' + tableName + ']', 'TOTAL'),
    none: console.log.bind(null, '[METRIC]', '[' + tableName + ']', 'NONE')
  };
  //Prefix log messages with log level
  console.log = console.log.bind(null, '[LOG]', '[' + tableName + ']');
  console.info = console.info.bind(null, '[INFO]', '[' + tableName + ']');
  console.error = console.error.bind(null, '[ERROR]', '[' + tableName + ']');
  console.warn = console.warn.bind(null, '[WARN]', '[' + tableName + ']');

  //Calculate and post metric for minutes behind record (rounded)
  var latestRecordTime= event.Records[event.Records.length - 1].dynamodb.ApproximateCreationDateTime * 1000;
  console.metric.table("MinutesBehindRecord", Math.round((Date.now() - latestRecordTime) / 60000));

  //For each unique table item, get the latest record
  var allRecords = event.Records.reduce(function(allRecords, record) {
    var keys= JSON.stringify(record.dynamodb.Keys);
    allRecords[keys] = record;
    return allRecords;
  }, {});

  //Build request object
  var requestItems = {};
  requestItems[tableName] = Object.keys(allRecords).reduce(function(requestItems, key){
    var record = allRecords[key];

    switch(record.eventName){
      case "INSERT":
      case "MODIFY":
        requestItems.push({ PutRequest: { Item: record.dynamodb.NewImage } });
        break;
      case "REMOVE":
        requestItems.push({ DeleteRequest: { Key: record.dynamodb.Keys } });
        break;
      default:
        console.warn("Unknown event type '" + record.eventName + "', record will not be processed");
        console.warn("Record data :", JSON.stringify(record));
        console.metric.total("UnknownEventTypes");
        break;
    }
    return requestItems;
  }, []);

  (function batchWrite(requestItems, attempt){
    //Write request items to replica table
    dynamodb.batchWriteItem({ RequestItems: requestItems }, function(err, data){
      if(err){
        if(RETRYABLE.indexOf(err.code) > -1){
          //Error is retryable, check for / set unprocessed items and warn
          console.warn("Retryable exception encountered :", err.code);
          if(data === null || typeof(data) === "undefined"){
            data = {};
          }
          if(!data.UnprocessedItems || Object.keys(data.UnprocessedItems).length === 0){
            data.UnprocessedItems = requestItems;
          }
        }else{
          //Error is not retryable, exit with error
          console.error("Non-retryable exception encountered\n", err.code, "-", err.message);
          console.error("Request Items:", JSON.stringify(requestItems));
          return callback(err);
        }
      }


      if(data.UnprocessedItems && Object.keys(data.UnprocessedItems).length !== 0){
        //There is unprocessed items, retry
        var delay = DELAY[attempt] || DELAY[MAX_DELAY_INDEX];

        if(delay + TIMEOUT_PADDING_MS >= context.getRemainingTimeInMillis()){
          //Lambda function will time out before request completes, exit with error
          console.error("Lambda function timed out after", attempt, "attempts");
          console.error("Request Items:", JSON.stringify(data.UnprocessedItems));
          return callback(new Error("Lambda function timed out after", attempts, "failed attempts"));
        }

        //Re-execute this function with unprocessed items after a delay
        console.log("Retrying batch write item request with unprocessed items in " + delay + " seconds");
        setTimeout(batchWrite, delay, data.UnprocessedItems, ++attempt);
      }else{
        //There is no unprocessed items, post metrics and exit succesfully
        console.metric.all("RecordsProcessed", event.Records.length);
        console.metric.none("RecordsWritten", Object.keys(allRecords).length);
        if(attempt - 1 > 0)
          console.metric.table("ThrottledRequests", attempt - 1);
        callback();
      }
    });
  })(requestItems, 1);
};
