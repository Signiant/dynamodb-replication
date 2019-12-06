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
      prefixLogger.error("Unable to write prefix to table");
      if(err.code == "ConditionalCheckFailedException"){
        prefixLogger.error("Prefix already exists in table");
        err.message = new Error("Prefix already exists in table");
      }
      prefixLogger.error(err.code, "-", err.message);
    }
    return callback(err);
  });
};
