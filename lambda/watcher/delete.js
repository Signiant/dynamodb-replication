// Constants
var CONTROLLER_TABLE = "{{controllerTable}}";

// Dependenceis
var AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

// Main handler function
exports.handler = function(event, context, callback){

  //Bind prefix to log levels
  console.log = console.log.bind(null, '[LOG]');
  console.info = console.info.bind(null, '[INFO]');
  console.warn = console.warn.bind(null, '[WARN]');
  console.error = console.error.bind(null, '[ERROR]');

  //Ensure event was successful
  if(event.detail.errorCode){
    console.warn("Table failed to delete, no action taken");
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
        console.log("Table", table, "not found in controller, no action taken");
        return callback();
      }else{
        console.error("Unable to update item");
        console.error(err.code, "-", err.message);
        return callback(err);
      }
    }

    console.log("Removal of replication for table", table, "initialized");
    return callback();
  });
};
