// Constants
var VIEW_TYPE = "NEW_AND_OLD_IMAGES";
var GLOBAL_TAG_KEY = "global";
var GLOBAL_TAG_VALUE = "true";

// Dependencies
var AWS = require('aws-sdk');
var sourcedb = new AWS.DynamoDB({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

const levelLogger = {
    log: (...args) => console.log( '[LOG]', ...args),
    info: (...args) => console.log( '[INFO]', ...args),
    warn: (...args) => console.log( '[WARN]', ...args),
    error: (...args) => console.log( '[ERROR]', ...args),
};

// Main handler function
exports.handler = function(event, context, callback){
  var tableName = event.table;

  // Wait for the table to be in its final state before trying to list the tags
  sourcedb.waitFor('tableExists', {TableName: tableName}, function(err, sourceTable){
    if(err){
      if(err.code == "ResourceNotFoundException"){
        levelLogger.error("Source table not found");
        levelLogger.error(err.code, "-", err.message);
        return callback(new Error("Source table could not be found"));
      }else{
        levelLogger.error("Unable to describe table");
        levelLogger.error(err.code, "-", err.message);
        return callback(err);
      }
    }

    sourcedb.listTagsOfResource({ ResourceArn: sourceTable.Table.TableArn }, function(err, data){
      if(err){
        levelLogger.error("Unable to list tags for table");
        return callback(err);
      }


      var hasGlobalTag = data.Tags.some(function(tag){
          return tag.Key === GLOBAL_TAG_KEY && tag.Value === GLOBAL_TAG_VALUE;
      });

      if(hasGlobalTag){
          levelLogger.info("Do not replicate source table "+tableName+" because it is a global table");
          return callback(new Error("Do not replicate global tables"));
      }

      //Check that stream specification is valid
      if(!sourceTable.Table.StreamSpecification || sourceTable.Table.StreamSpecification.StreamEnabled === false || sourceTable.Table.StreamSpecification.StreamViewType != VIEW_TYPE){
        levelLogger.error("Invalid stream specification");
        levelLogger.info("Specification:", JSON.stringify(sourceTable.Table.StreamSpecification) || "None");
        return callback(new Error("Invalid Stream Specification - Streams must be enabled on source table with view type set to " + VIEW_TYPE));
      }

      //Set keySchema and initialStreamArn properties in controller table item
      var returnData = {
        keySchema: JSON.stringify(sourceTable.Table.KeySchema),
        initialStreamArn: sourceTable.Table.LatestStreamArn
      };
      return callback(null, returnData);
    });
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
