import * as cdk from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { ColdStartPerfConstruct } from "./cold-start-perf-construct";
import { LoggingFormat } from "aws-cdk-lib/aws-lambda";
import { Billing, TableV2 } from "aws-cdk-lib/aws-dynamodb";

// import * as sqs from 'aws-cdk-lib/aws-sqs';
export class ColdStartPerfStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dummyDatabase = new TableV2(this, "OtelDatabase", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: { name: "id", type: cdk.aws_dynamodb.AttributeType.STRING },
      billing: Billing.onDemand(),
    });

    const testFunctionGroup = new cdk.aws_logs.LogGroup(
      this,
      "TestFunctionLogGroup",
      {}
    );

    const functionToTest = new NodejsFunction(this, "Function", {
      functionName: "otel-base-lambda",
      entry: "lib/lambda/base/handler.ts",
      loggingFormat: LoggingFormat.JSON,
      logGroup: testFunctionGroup,
    });
    const anotherFunctionToTest = new NodejsFunction(this, "AnotherFunction", {
      functionName: "otel-base-lambda-another",
      entry: "lib/lambda/base/handler.ts",
      loggingFormat: LoggingFormat.JSON,
      logGroup: testFunctionGroup,
    });

    const functionsToTest = [functionToTest, anotherFunctionToTest];

    functionsToTest.forEach((fn) => {
      fn.addEnvironment("TABLE_NAME", dummyDatabase.tableName);
      dummyDatabase.grantReadWriteData(fn);
    });

    new ColdStartPerfConstruct(this, "ColdStartPerfConstruct", {
      lambdaFunctions: functionsToTest,
      tableName: dummyDatabase.tableName,
    });
  }
}
