// Dependencies
var AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var cloudwatch = new AWS.CloudWatchEvents({ apiVersion: '2015-10-07' });

// Handler Function
exports.handler = function(event, context, callback){

  //Prefix log messages with log level
  console.log = console.log.bind(null, '[LOG]');
  console.info = console.info.bind(null, '[INFO]');
  console.error = console.error.bind(null, '[ERROR]');
  console.warn = console.warn.bind(null, '[WARN]');

  //Only act on new prefixes
  if(event.Records[0].eventName !== "INSERT"){
    console.warn("No action taken for event of type", event.Records[0].eventName);
    return callback();
  }
  //Grab Prefix from event
  var prefix = event.Records[0].dynamodb.NewImage.prefix.S;

  listPrefixedTables(prefix, function(err, tables){
    if(err){
      console.error("Unable to list tables");
      console.error(err.code, "-", err.message);
      return callback(err);
    }

    createReplications(tables, callback);
  });
};

// Helper function to create new replications for a list of tables
function createReplications(tables, callback){
  var batches = [];

  // Construct batches of custom cloudwatch event requests
  while(tables.length > 0){
    batches.push(tables.splice(0, 10).map(buildEvent));
  }

  // Put events to cloudwatch
  (function putEvents(events){
    cloudwatch.putEvents({ Entries: events }, function(err, data){
      if(err){
        console.error("Unable to post custom CloudWatch events")
        console.error(err.code, "-", err.message);
        return callback(err);
      }

      // If there are any failed entries, find and retry them
      if(data.FailedEntryCount > 0){
        var failedEntries = [];
        for(var i = 0; i < data.Entries.length; i++){
          console.warn(data.FailedEntryCount, " failed entries");
          if(data.Entries[i].ErrorCode){
            console.warn(data.Entries[i].ErrorCode, "-", data.Entris[i].ErrorMessage);
            failedEntries.push(events[i]);
          }
        }
        console.warn("Retrying put for", data.FailedEntryCount, "entries");
        putEvents(failedEntries);
      }else{
        // Loop until no batches are left to be processed
        if(batches.length > 0)
          putEvents(batches.shift());
        else
          return callback();
      }
    });
  }(batches.shift()));
}

// Helper function to find all tables matching the given prefix
function listPrefixedTables(prefix, callback){
  var tables = [];

  (function getPage(lastTable){
    dynamodb.listTables({ ExclusiveStartTableName: lastTable }, function(err, data){
      if(err){
        return callback(err);
      }

      tables = tables.concat(data.TableNames);

      if(data.LastEvaluatedTableName){
        //If list is complete, get next set of tables, otherwise
        getPage(data.LastEvaluatedTableName);
      }else{
        //Return all tables in list starting with a matching prefix
        tables = tables.filter(function(table){ return table.startsWith(prefix); });
        callback(null, tables);
      }
    });
  })();
}

// Helper function to build a mock CreateTable event from the table name
function buildEvent(table){
  var detail = {
    eventSource: "dynamodb.amazonaws.com",
    eventName: "CreateTable",
    awsRegion: process.env.AWS_REGION,
    requestParameters: {
      tableName: table
    }
  };

  return {
    Detail: JSON.stringify(detail),
    DetailType: "Mock API Call via ReplicationWatcher",
    Source: "replication.watcher.prefix.init"
  };
}
