import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { handleEvent } from "../handleEvent";
const tableName = process.env["TABLE_NAME"]!;
const dynamodbClient = new DynamoDB({});

const handler = async (event: any, context: any) => {
  await handleEvent(context, dynamodbClient, tableName);
  return;
};

// export type needs to be changed 
module.exports = { handler };



