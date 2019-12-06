// Constants
var CONTROLLER_TABLE = "{{controllerTable}}";

// Dependenceis
var AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

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
    levelLogger.warn("Table failed to delete, no action taken");
    return callback();
  }

  //Grab table name frome event object
  var table = event.detail.requestParameters.tableName;

  //Update the item, if it exists, to the STOP_REPLICATION step
  var params = {
    TableName: CONTROLLER_TABLE,
    ConditionExpression: "attribute_exists (tableName)",
    Key: {
      tableName: { "S" : table }
    },
    UpdateExpression: "set #step = :step, #state = :state",
    ExpressionAttributeNames: {
      "#step": "step",
      "#state": "state"
    },
    ExpressionAttributeValues: {
      ":step": { "S" : "STOP_REPLICATION" },
      ":state": { "S" : "PENDING" }
    }
  };

  dynamodb.updateItem(params, function(err, data){
    if(err){
      if(err.code == "ConditionalCheckFailedException"){
        levelLogger.log("Table", table, "not found in controller, no action taken");
        return callback();
      }else{
        levelLogger.error("Unable to update item");
        levelLogger.error(err.code, "-", err.message);
        return callback(err);
      }
    }

    levelLogger.log("Removal of replication for table", table, "initialized");
    return callback();
  });
};
