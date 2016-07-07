// Dependencies
var AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB({apiVersion: "2012-08-10"});

// Main handler function
exports.handler = function(event, context, callback){

  var prefix = event.prefix;
  var prefixTable = event.prefixTable;

  //Prefix log messages with log level
  console.log = console.log.bind(null, '[LOG]', '[' + prefix + ']');
  console.info = console.info.bind(null, '[INFO]', '[' + prefix + ']');
  console.error = console.error.bind(null, '[ERROR]', '[' + prefix + ']');
  console.warn = console.warn.bind(null, '[WARN]', '[' + prefix + ']');

  //Add prefix to table, if exists
  var params = {
    TableName: prefixTable,
    Item: {
      prefix: { S: prefix }
    },
    ConditionExpression: 'attribute_not_exists (prefix)'
  };

  dynamodb.putItem(params, function(err, data){
    if(err){
      console.error("Unable to write prefix to table");
      if(err.code == "ConditionalCheckFailedException"){
        console.error("Prefix already exists in table");
        err.message = new Error("Prefix already exists in table");
      }
      console.error(err.code, "-", err.message);
    }
    return callback(err);
  });
};
