import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { handleEvent } from "../handleEvent";
import { captureAWSv3Client, captureHTTPs } from 'aws-xray-sdk';
import { captureFetchGlobal } from "aws-xray-sdk-fetch";

// Capture all outgoing https calls
captureFetchGlobal();

const tableName = process.env["TABLE_NAME"]!;
const dynamodbClient = captureAWSv3Client(new DynamoDB({}));

export const handler = async (event: any, context: any) => {
  await handleEvent(context, dynamodbClient, tableName);
  return;
};



