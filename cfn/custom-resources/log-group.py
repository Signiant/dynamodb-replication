import cfnresponse
import boto3
import botocore
import json

def handler(event, context):
    client = boto3.client('logs')
    responseStatus = cfnresponse.SUCCESS
    responseData = {}

    if event['RequestType'] == 'Create' or event['RequestType'] == 'Update':
        groupName = '/aws/lambda/%s' % event['ResourceProperties']['FunctionName']
        try:
            response = client.create_log_group(logGroupName=groupName)
            responseData['LogGroupName'] = groupName

        except botocore.exceptions.ClientError as e:
            if e.response['Error']['Code'] == 'ResourceAlreadyExistsException':
                responseData['LogGroupName'] = groupName
            else:
                responseData['Error'] = e.response['Error']['Message']
                responseStatus = cfnresponse.FAILED

    cfnresponse.send(event, context, responseStatus, responseData)
