// Constants
var PREFIX_TABLE = "{{prefixTable}}";
var CONTROLLER_TABLE = "{{controllerTable}}";

// Dependencies
var AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

// Main handler function
exports.handler = function(event, context, callback){

  //Bind prefix to log levels
  console.log = console.log.bind(null, '[LOG]');
  console.info = console.info.bind(null, '[INFO]');
  console.warn = console.warn.bind(null, '[WARN]');
  console.error = console.error.bind(null, '[ERROR]');


  //Ensure event was successful
  if(event.detail.errorCode){
    console.warn("Source table failed to create, no action taken");
    return callback();
  }

  //Grab new table name from event object
  var table = event.detail.requestParameters.tableName;

  // Retrieve prefix list from dynamodb
  dynamodb.scan({ TableName: PREFIX_TABLE }, function(err, data){
    if(err){
      console.error("Failed to retrieve prefix list from dynamodb");
      console.error(err.name, "-", err.message);
      return callback(err);
    }

    //Verify prefixes exist in list
    if(!data.Items || data.Items.length === 0){
      console.log("No prefixes in table");
      return callback();
    }

    //Check if table name uses any of the listed prefixes
    if (!data.Items.some(function(pre){ return table.startsWith(pre.prefix);}) ){
      console.log("No action taken for table", table);
      return callback();
    }

    //Table matches prefix, create controller entry for table in initial step/state
    var params = {
      TableName: CONTROLLER_TABLE,
      Item: {
        tableName: table,
        step:"VALIDATE_SOURCE",
        state: "PENDING"
      }
    };

    //If this function is being invoked by prefix initialization, don't overwrite existing items
    if(event.source == "replication.watcher.prefix.init"){
      params.ConditionExpression = "(attribute_not_exists (tableName)) or (#F = :failed)";
      params.ExpressionAttributeValues = { ":failed": "FAILED" };
      params.ExpressionAttributeNames =  { "#F": "state" };
    }

    //Add new entry to controller table
    dynamodb.put(params, function(err, data){
      if(err && err.code != "ConditionalCheckFailedException"){
        console.error("Failed to add table to controller");
        console.error(err.code, "-", err.message);
        return callback(err);
      }
      callback();
    });

  });
};
