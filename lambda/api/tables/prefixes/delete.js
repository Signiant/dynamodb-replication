// Dependencies
var AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB({apiVersion: "2012-08-10"});

const logger = require('../../../logger');

// Main handler function
exports.handler = function(event, context, callback){

  var prefix = event.prefix;
  var prefixTable = event.prefixTable;
  
  const prefixLogger = logger.prefixLogger(prefix);

  // Delete prefix from table
  var params = {
    TableName: prefixTable,
    Key: {
      prefix: { S: prefix }
    }
  };

  dynamodb.deleteItem(params, function(err, data){
    if(err){
      prefixLogger.error("Unable to delete item from prefix table");
      prefixLogger.error(err.code, "-", err.data);
    }
    return callback(err);
  });
};
