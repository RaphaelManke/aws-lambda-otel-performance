import { DynamoDB } from "@aws-sdk/client-dynamodb";

export async function handleEvent(context: any, dynamodbClient: DynamoDB, tableName: string) {
    (await fetch("https://api.github.com/users/octocat")).json();

    await dynamodbClient.putItem({
        TableName: tableName,
        Item: {
            id: { S: context.awsRequestId },
        },
    });
}
