import { DynamoDB } from "@aws-sdk/client-dynamodb";
const tableName = process.env["TABLE_NAME"];
const dynamodbClient = new DynamoDB({});
export const handler = async (event: any, context: any) => {
  (await fetch("https://api.github.com/users/octocat")).json();

  await dynamodbClient.putItem({
    TableName: tableName,
    Item: {
      id: { S: context.awsRequestId },
    },
  });

  return;
};
