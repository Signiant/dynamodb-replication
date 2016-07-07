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

  // Delete prefix from table
  var params = {
    TableName: prefixTable,
    Key: {
      prefix: { S: prefix }
    }
  };

  dynamodb.deleteItem(params, function(err, data){
    if(err){
      console.error("Unable to delete item from prefix table");
      console.error(err.code, "-", err.data);
    }
    return callback(err);
  });
};
