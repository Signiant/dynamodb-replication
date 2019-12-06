// Dependencies
var AWS = require("aws-sdk");
var dynamodb = new AWS.DynamoDB({apiVersion: "2012-08-10"});

const levelLogger = {
    log: (...args) => console.log( '[LOG]', ...args),
    info: (...args) => console.log( '[INFO]', ...args),
    warn: (...args) => console.log( '[WARN]', ...args),
    error: (...args) => console.log( '[ERROR]', ...args),
}

const prefixLogger = (prefix) => ({
    log: (...args) => levelLogger.log(`[${prefix}]`, ...args),
    info: (...args) => levelLogger.info(`[${prefix}]`, ...args),
    warn: (...args) => levelLogger.warn(`[${prefix}]`, ...args),
    error: (...args) => levelLogger.error(`[${prefix}]`, ...args),
});

// Main handler function
exports.handler = function(event, context, callback){

  var table = event.table;
  const tableLogger = prefixLogger(table);

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
        tableLogger.error("Trying to delete a replication doesn't exist");
        err.message = "Replication not found in controller table";
      }else{
        tableLogger.error("Unable to update item");
      }
      tableLogger.error(err.code, "-", err.message);
      return callback(err);
    }

    tableLogger.log("Item updated succesfully");
    callback(err, data);
  });
};
