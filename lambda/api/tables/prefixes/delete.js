// Dependencies
var AWS = require('aws-sdk');
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

  var prefix = event.prefix;
  var prefixTable = event.prefixTable;
  
  const prefixLogger = prefixLogger(prefix);

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
