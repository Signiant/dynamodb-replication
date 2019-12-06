// Dependencies
var AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10'});

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
var handler = exports.handler = function(event, context, callback){

  var table = event.table;
  const tableLogger = prefixLogger(table);
  
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
