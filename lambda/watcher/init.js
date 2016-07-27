// Constants
var CREATE_FUNCTION = "{{createFunction}}";

// Dependencies
var AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var lambda = new AWS.Lambda({ apiVersion: '2015-03-31' });

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

  var invocationsReturned = 0;
  var invocationsFailed = 0;

  tables.forEach(function(table){

    //Construct fake clouwatch CreateTable event
    var payload = {
      detail: {
        eventSource: "replication.watcher.init",
        eventName: "CreateTable",
        awsRegion: process.env.AWS_REGION,
        requestParameters: {
          tableName: table
        }
      }
    };
    var params = {
      FunctionName: CREATE_FUNCTION,
      Payload: JSON.stringify(payload, null, 2)
    };

    //Invoke watcher create function with fake cloudwatch event
    lambda.invoke(params, function(err, response){
      if(err){
        invocationsFailed++;
        console.error("Error invoking lambda function");
        console.error(err.code, "-", err.message);
      }

      // If all invocations are finished, return
      if(++invocationsReturned >= tables.length){
        //Only return an error if ALL functions failed
        if(invocationsFailed != invocationsReturned)
          err = null;

        return callback(err);
      }
    });
  });
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
