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

  var controller = event.controller;
  var table = event.table;
  
  const tableLogger = prefixLogger(table);
  
  //Verify table exists in source region
  dynamodb.describeTable({ TableName: table }, function(err, data){
    if(err){
      if(err.code == "ResourceNotFoundException")
        return callback(new Error("Table " + table +" not found in source region"));
      else
        return callback(err);
    }

    //Table exists, create controller entry for table
    var params = {
      TableName: controller,
      ConditionExpression: "attribute_not_exists (tableName)",
      Item: {
        tableName: { "S" : table },
        step: { "S" : "VALIDATE_SOURCE" },
        state:{ "S" : "PENDING" }
      }
    };

    //Add item to controller table
    dynamodb.putItem(params, function(err, data){
      if(err){
        if(err.code == "ConditionalCheckFailedException"){
          tableLogger.error("Item already exists in controller table");
          err.message = "Table " + table + " is already being replicated";
        }else{
          tableLogger.error("Unable to write item to table");
        }
        tableLogger.error(err.code, "-", err.message);
        return callback(err);
      }
      tableLogger.log("Response :", JSON.stringify(data));
      return callback();
    });
  });
};
