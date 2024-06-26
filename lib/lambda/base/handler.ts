import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { handleEvent } from "../handleEvent";
const tableName = process.env["TABLE_NAME"]!;
const dynamodbClient = new DynamoDB({});

export const handler = async (event: any, context: any) => {
  await handleEvent(context, dynamodbClient, tableName);
  return;
};



