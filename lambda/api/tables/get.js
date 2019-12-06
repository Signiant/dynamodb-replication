// Dependencies
var AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10'});
const logger = require('../../logger');

// Main handler function
var handler = exports.handler = function(event, context, callback){

  var table = event.table;
  const tableLogger = logger.prefixLogger(table);
  
  //Grab items from table
  dynamodb.scan({
    TableName: event.table,
    AttributesToGet: event.attributes
  }, function(err, data){
    if(err){
      tableLogger.error("Error scanning table");
      tableLogger.error(err.code, "-", err.message);
      return callback(err);
    }
    //Return items
    return callback(null, { items: data.Items });
  });
};
