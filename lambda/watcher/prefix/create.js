// Constants
var PREFIX_TABLE = "{{prefixTable}}";
var CONTROLLER_TABLE = "{{controllerTable}}";

// Dependencies
var AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

const levelLogger = {
    log: (...args) => console.log( '[LOG]', ...args),
    info: (...args) => console.log( '[INFO]', ...args),
    warn: (...args) => console.log( '[WARN]', ...args),
    error: (...args) => console.log( '[ERROR]', ...args),
};

// Main handler function
exports.handler = function(event, context, callback){
  //Ensure event was successful
  if(event.detail.errorCode){
    levelLogger.warn("Source table failed to create, no action taken");
    return callback();
  }

  //Grab new table name from event object
  var table = event.detail.requestParameters.tableName;

  // Retrieve prefix list from dynamodb
  dynamodb.scan({ TableName: PREFIX_TABLE }, function(err, data){
    if(err){
      levelLogger.error("Failed to retrieve prefix list from dynamodb");
      levelLogger.error(err.name, "-", err.message);
      return callback(err);
    }

    //Verify prefixes exist in list
    if(!data.Items || data.Items.length === 0){
      levelLogger.log("No prefixes in table");
      return callback();
    }

    //Check if table name uses any of the listed prefixes
    if (!data.Items.some(function(pre){ return table.startsWith(pre.prefix);}) ){
      levelLogger.log("No action taken for table", table);
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
        levelLogger.error("Failed to add table to controller");
        levelLogger.error(err.code, "-", err.message);
        return callback(err);
      }
      callback();
    });

  });
};
