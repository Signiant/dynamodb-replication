// Constants
var REPLICA_REGION = "{{replicaRegion}}";

// Dependencies
var AWS = require('aws-sdk');
var sourcedb = new AWS.DynamoDB({apiVersion: '2012-08-10', region: process.env.AWS_REGION });
var replicadb = new AWS.DynamoDB({apiVersion: '2012-08-10', region: REPLICA_REGION});

// Main handler function;
exports.handler = function(event, context, callback){

  //Bind prefix to log levels
  console.log = console.log.bind(null, '[LOG]');
  console.info = console.info.bind(null, '[INFO]');
  console.warn = console.warn.bind(null, '[WARN]');
  console.error = console.error.bind(null, '[ERROR]');

  var table = event.table;

  sourcedb.describeTable({ TableName: table }, function(err, data){
    if(err){
      console.error("Unable to describe table");
      console.error(err.code, "-", err.message);
      return callback(err);
    }

    var billingMode = 'PROVISIONED';
    // Check the billing mode of the table
    if (data.Table.hasOwnProperty('BillingModeSummary') &&
        data.Table.BillingModeSummary.BillingMode === 'PAY_PER_REQUEST') {
        billingMode = 'PAY_PER_REQUEST';
    }

    //Construct replica table using source table description
    var params = {
      TableName: data.Table.TableName,
      BillingMode: billingMode,
      AttributeDefinitions: data.Table.AttributeDefinitions,
      KeySchema: data.Table.KeySchema,
      StreamSpecification: {
        StreamEnabled: true,
        StreamViewType: 'NEW_AND_OLD_IMAGES'
      }
    };

    // if the billingMode is PROVISIONED, need to add the throughput numbers
    if (billingMode === 'PROVISIONED') {
      params.ProvisionedThroughput = {
        ReadCapacityUnits: data.Table.ProvisionedThroughput.ReadCapacityUnits,
        WriteCapacityUnits: data.Table.ProvisionedThroughput.WriteCapacityUnits
      };
    }

    if(data.Table.GlobalSecondaryIndexes){
      params.GlobalSecondaryIndexes = processIndexes(billingMode, data.Table.GlobalSecondaryIndexes);
    }
    if(data.Table.LocalSecondaryIndexes){
      params.LocalSecondaryIndexes = processIndexes(billingMode, data.Table.LocalSecondaryIndexes);
    }

    replicadb.createTable(params, function(err, data){
      if(err){

        if(err.name == "LimitExceededException" || err.name == "InternalServerError"){
          //Retry-able, retry step
          console.warn("Retryable exception encountered -", err.name + ", setting table status to RETRYING");
          return callback(null, { status: "RETRYING", stateMessage: "Retryable exception " + err.name + " encountered" });
        }else if(err.name == 'ResourceInUseException'){
          //Replica table already exists, fail step
          console.error("Table already exists in replica region");
          console.error(err.name, "-", err.message);
          return callback(err);
        }else{
          //Non retry-able, fail step
          console.error("Non-retryable exception encountered");
          console.error(err.name, "-", err.message);
          return callback(err);
        }
      }
      callback();

    });
  });

};

//Helper function - Construct replica table indexes from source index descriptions
function processIndexes(billingMode, indexes) {
  return indexes.reduce(function(newIndexes, index){
    var newIndex = {
      IndexName: index.IndexName,
      KeySchema: index.KeySchema,
      Projection: index.Projection
    };
    if (billingMode === 'PROVISIONED') {
      if(index.ProvisionedThroughput) {
        newIndex.ProvisionedThroughput = {
          ReadCapacityUnits: index.ProvisionedThroughput.ReadCapacityUnits,
          WriteCapacityUnits: index.ProvisionedThroughput.WriteCapacityUnits
        };
      }
    }
   newIndexes.push(newIndex);
   return newIndexes;
  }, []);
}
