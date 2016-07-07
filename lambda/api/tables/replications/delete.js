// Dependencies
var AWS = require("aws-sdk");
var dynamodb = new AWS.DynamoDB({apiVersion: "2012-08-10"});

// Main handler function
exports.handler = function(event, context, callback){

  var table = event.table;

  //Prefix log messages with log level
  console.log = console.log.bind(null, '[LOG]', '[' + table + ']');
  console.info = console.info.bind(null, '[INFO]', '[' + table + ']');
  console.error = console.error.bind(null, '[ERROR]', '[' + table + ']');
  console.warn = console.warn.bind(null, '[WARN]', '[' + table + ']');

  var params = {
    TableName: event.controller,
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
        console.error("Trying to delete a replication doesn't exist");
        err.message = "Replication not found in controller table";
      }else{
        console.error("Unable to update item");
      }
      console.error(err.code, "-", err.message);
      return callback(err);
    }

    console.log("Item updated succesfully");
    callback(err, data);
  });
};
