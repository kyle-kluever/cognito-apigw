const AWS = require('aws-sdk');

exports.handler = async (event) => {
    try {
        var cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();
        
        switch (event.RequestType) {
            case 'Create':
                await cognitoIdentityServiceProvider.createResourceServer({
                    Identifier: event.ResourceProperties.Identifier,
                    Name: event.ResourceProperties.Name,
                    UserPoolId: event.ResourceProperties.UserPoolId,
                    Scopes: [event.ResourceProperties.Scopes]
                }).promise();
                break;
                
            case 'Update':
                await deleteResourceServer(cognitoIdentityServiceProvider, event.OldResourceProperties.Identifier, event.OldResourceProperties.UserPoolId);
                
                await cognitoIdentityServiceProvider.createResourceServer({
                    Identifier: event.ResourceProperties.Identifier,
                    Name: event.ResourceProperties.Name,
                    UserPoolId: event.ResourceProperties.UserPoolId,
                    Scopes: [event.ResourceProperties.Scopes]
                }).promise();
                break;
                
            case 'Delete':
                await deleteResourceServer(cognitoIdentityServiceProvider, event.OldResourceProperties.Identifier, event.OldResourceProperties.UserPoolId);
                break;
        }
        
        await sendCloudFormationResponse(event, 'SUCCESS');
        console.info(`CognitoResourceServer Success for request type ${event.RequestType}`);
    } catch (error) {
        console.error(`CognitoResourceServer Error for request type ${event.RequestType}:`, error);
        await sendCloudFormationResponse(event, 'FAILED');
    }
}

async function deleteResourceServer(cognitoIdentityServiceProvider, identifier, userPoolId) {
    var response = await cognitoIdentityServiceProvider.describeResourceServer({
        Identifier: identifier,
        UserPoolId: userPoolId
    }).promise();
    
    if (response.ResourceServer.Identifier) {
        await cognitoIdentityServiceProvider.deleteResourceServer({
            Identifier: response.ResourceServer.Identifier,
            UserPoolId: response.ResourceServer.UserPoolId
        }).promise();
    }
}

async function sendCloudFormationResponse(event, responseStatus, responseData) {
    var params = {
        FunctionName: 'CloudFormationSendResponse',
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify({
            StackId: event.StackId,
            RequestId: event.RequestId,
            LogicalResourceId: event.LogicalResourceId,
            ResponseURL: event.ResponseURL,
            ResponseStatus: responseStatus,
            ResponseData: responseData
        })
    };
    
    var lambda = new AWS.Lambda();
    var response = await lambda.invoke(params).promise();
    
    if (response.FunctionError) {
        var responseError = JSON.parse(response.Payload);
        throw new Error(responseError.errorMessage);
    }
}
