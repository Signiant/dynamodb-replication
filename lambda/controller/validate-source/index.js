// Constants
var VIEW_TYPE = "NEW_AND_OLD_IMAGES";

// Dependencies
var AWS = require('aws-sdk');
var sourcedb = new AWS.DynamoDB({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

// Main handler function
exports.handler = function(event, context, callback){

  //Bind prefix to log levels
  console.log = console.log.bind(null, '[LOG]');
  console.info = console.info.bind(null, '[INFO]');
  console.warn = console.warn.bind(null, '[WARN]');
  console.error = console.error.bind(null, '[ERROR]');

  var tableName = event.table;

  sourcedb.describeTable({TableName: tableName}, function(err, sourceTable){
    if(err){
      if(err.code == "ResourceNotFoundException"){
        console.error("Source table not found");
        console.error(err.code, "-", err.message);
        return callback(new Error("Source table could not be found"));
      }else{
        console.error("Unable to describe table");
        console.error(err.code, "-", err.message);
        return callback(err);
      }
    }

    //Check that stream specification is valid
    if(!sourceTable.Table.StreamSpecification || sourceTable.Table.StreamSpecification.StreamEnabled === false || sourceTable.Table.StreamSpecification.StreamViewType != VIEW_TYPE){
      console.error("Invalid stream specification");
      console.info("Specification:", JSON.stringify(sourceTable.Table.StreamSpecification) || "None");
      return callback(new Error("Invalid Stream Specification - Streams must be enabled on source table with view type set to " + VIEW_TYPE));
    }

    //Set keySchema and initialStreamArn properties in controller table item
    var returnData = {
      keySchema: JSON.stringify(sourceTable.Table.KeySchema),
      initialStreamArn: sourceTable.Table.LatestStreamArn
    };
    return callback(null, returnData);
  });
};

//CURRENTLY UNUSED - Helper function - enable stream on source table
function enableStream(tableName, callback){
  var params = {
    TableName: tableName,
    StreamSpecification: {
      StreamEnabled: true,
      StreamViewType: VIEW_TYPE
    }
  };
  sourcedb.updateTable(params, function(err, data){
    if(err){
      callback(err);
    }else{
      callback(null, data.Table.LatestStreamArn);
    }
  });
}
