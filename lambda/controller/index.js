// Constants
var REPLICATOR = "{{replicatorFunction}}";
var STEP_MAP = {
  "VALIDATE_SOURCE": "{{validateSourceFunction}}",
  "VALIDATE_REPLICA": "{{validateReplicaFunction}}",
  "CREATE_REPLICA": "{{createReplicaFunction}}",
  "START_REPLICATION": "{{startReplicationFunction}}",
  "STOP_REPLICATION": "{{stopReplicationFunction}}"
};

// Dependencies
var AWS = require('aws-sdk');
var lambda = new AWS.Lambda({ apiVersion: '2015-03-31' });
var dynamodb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

// Main handler function
exports.handler = function(event, context, callback){

  //Bind prefix to log levels
  console.log = console.log.bind("[LOG]");
  console.info = console.info.bind("[INFO]");
  console.warn = console.warn.bind("[WARN]");
  console.error = console.error.bind("[ERROR]");

  //Function expects batch size of 1
  if(!event.Records || !event.Records[0] || event.Records[0].eventSource != 'aws:dynamodb'){
    console.warn("Invalid event object, no action taken");
    return callback();
  }

  event = event.Records[0];

  if(event.eventName != 'INSERT' && event.eventName != 'MODIFY'){
    console.log('No action taken for event', event.eventName, 'on record', JSON.stringify(event));
    return callback();
  }

  var controllerTable;
  var tableName;
  var state;
  var step;

  //Extract data from events
  try{
    controllerTable = event.eventSourceARN.split('/')[1];
    tableName = event.dynamodb.NewImage.tableName.S;
    state = event.dynamodb.NewImage.state.S;
    step = event.dynamodb.NewImage.step.S;
  }catch(err){
    console.warn("Invalid event object, failing step");
    console.info("Thrown:", err);
    return callback(new Error("Internal Error - Lambda function invoked with invalid event object"));
  }

  if(state =='COMPLETE') {
    //If the state for a step is complete, move to state PENDING on next step
    var steps = Object.keys(STEP_MAP);
    var nextStepIndex = steps.indexOf(step) + 1;

    if(nextStepIndex < steps.length ){
      var nextStep = {
        step: steps[nextStepIndex],
        state: 'PENDING'
      };
      return updateController(controllerTable, tableName, nextStep, callback);
    }else{
      //If all steps are complete, delete item from controller table
      return deleteItem(controllerTable, tableName, callback);
    }

  }else if(state =='RETRYING'){
    //Set state back to pending to try again
    state = 'PENDING';
  }

  if(state != 'PENDING') {
    //If not pending, don't take action
    console.log('No action taken for item with state', state);
    return callback();
  }

  if(!STEP_MAP[step]) {
    //No action for current step, so it fails
    console.warn("No action mapped to step", step);
    var items = {
      step: step,
      state: "FAILED",
      stateMessage: "Internal Error - No lambda function mapped to step " + step
    };
    return updateController(controllerTable, tableName, items, callback);
  }

  var payload = {
    controller: controllerTable,
    table: tableName,
    replicator: REPLICATOR,
    record: event.dynamodb.NewImage
  };

  var params = {
    FunctionName: STEP_MAP[step],
    Payload: JSON.stringify(payload, null, 2)
  };


  lambda.invoke(params, function(err, response){
    if(err){
      if(err.code == "ResourceNotFoundException"){
        //Step is mapped to a lambda function that doesn't exist, fail
        console.warn("Lambda function", STEP_MAP[step], "(mapped to step " + step + ") does not exist.");
        //Simulate a function error, delaying failure until response is processed
        response = {
          FunctionError: true,
          Payload: JSON.stringify({errorMessage: "Internal Error - Lambda function for step " + step + " does not exist"})
        };
      }else{
        //General failure, fail this execution to try again
        console.error("Error invoking lambda function");
        console.error(err.code, "-", err.message);
        return callback(err);
      }
    }

    var data = JSON.parse(response.Payload);

    var items = {};

    if(response.FunctionError){
      //Function failed execution, set state to failed, report error message
      console.error("Function error: ", JSON.stringify(data));
      items.step = step;
      items.state = 'FAILED';
      items.stateMessage = data.errorMessage;
    }else{
      //Set default values for mandatory params
      items.step = step;
      items.state = 'COMPLETE';
      items.stateMessage= items.step + " " + items.state;

      //Set key value pairs from returned data
      for(var key in data){
        if(typeof data[key] != 'string')
          data[key] = JSON.stringify(data[key]);
        items[key] = data[key];
      }
    }
    updateController(controllerTable, tableName, items, callback);
  });
};

// Helper function to update an item in the controller table
function updateController(controller, table, items, callback){
  var params = {
    TableName: controller,
    Key: {
      tableName: table
    },
    UpdateExpression: [],
    ExpressionAttributeNames: {},
    ExpressionAttributeValues: {}
  };

  //Construct update using the returned data
  for(var key in items){
    params.UpdateExpression.push('#' + key + ' = :' + key);
    params.ExpressionAttributeNames['#' + key] = key;
    params.ExpressionAttributeValues[':' + key] = items[key];
  }
  params.UpdateExpression = 'set ' + params.UpdateExpression.join(', ');

  dynamodb.update(params, function(err, data){
    if(err){
      console.error("Failed to write to controller table");
      callback(err);
    }else{
      callback();
    }
  });
}


// Helper function to delete an item in the controller table
function deleteItem(controller, table, callback){
  var params = {
    TableName: controller,
    Key: {
      tableName: table
    }
  };
  dynamodb.delete(params, function(err, data){
    if(err)
      console.error("Unable to delete item from table");
    return callback(err);
  });
}
