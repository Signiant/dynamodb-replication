// Dependencies
var AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10'});

// Main handler function
var handler = exports.handler = function(event, context, callback){

  var table = event.table;

  //Prefix log messages with log level
  console.log = console.log.bind(null, '[LOG]', '[' + table + ']');
  console.info = console.info.bind(null, '[INFO]', '[' + table + ']');
  console.error = console.error.bind(null, '[ERROR]', '[' + table + ']');
  console.warn = console.warn.bind(null, '[WARN]', '[' + table + ']');

  //Grab items from table
  dynamodb.scan({
    TableName: event.table,
    AttributesToGet: event.attributes
  }, function(err, data){
    if(err){
      console.error("Error scanning table");
      console.error(err.code, "-", err.message);
      return callback(err);
    }
    //Return items
    return callback(null, { items: data.Items });
  });
};
