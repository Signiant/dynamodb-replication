// Dependencies
var AWS = require("aws-sdk");
var dynamodb = new AWS.DynamoDB({apiVersion: "2012-08-10"});

// Main handler function
exports.handler = function(event, context, callback){

  var controller = event.controller;
  var table = event.table;

  //Prefix log messages with log level
  console.log = console.log.bind(null, '[LOG]', '[' + table + ']');
  console.info = console.info.bind(null, '[INFO]', '[' + table + ']');
  console.error = console.error.bind(null, '[ERROR]', '[' + table + ']');
  console.warn = console.warn.bind(null, '[WARN]', '[' + table + ']');

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
          console.error("Item already exists in controller table");
          err.message = "Table " + table + " is already being replicated";
        }else{
          console.error("Unable to write item to table");
        }
        console.error(err.code, "-", err.message);
        return callback(err);
      }
      console.log("Response :", JSON.stringify(data));
      return callback();
    });
  });
};
