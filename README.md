# DynamoDB Replication
The dynamodb replication solution makes use of dynamodb table streams and lambda functions to replicate data cross regions in near real time.

## Documentation  
This README serves as a 'quick start' guide for getting replication up and running.  Full documentation can be found in the  [wiki](https://github.com/Signiant/dynamodb-replication/wiki).  

## Deployment
DymanoDB replication infrastructure is managed entirely through cloudformation.  
To deploy, simply use the cloudformation template from the latest [release](https://github.com/Signiant/dynamodb-replication/releases) to create a new cloudformation stack.

## Building The Template
If you're making any changes of your own to the code, you will need to generate a new cloudformation template before you can deploy. To do this, execute the following steps:

1. Install dependencies:  
    ```
    $ npm install
    ```  

2. Build the template:  
    ```
    $ npm run build
    ```  

The generated template will be output to dist/replication.cfn.json