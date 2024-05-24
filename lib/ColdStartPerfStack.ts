import * as cdk from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { ColdStartPerfConstruct } from "./cold-start-perf-construct";
import { LoggingFormat } from "aws-cdk-lib/aws-lambda";
import { Billing, TableV2 } from "aws-cdk-lib/aws-dynamodb";
import { BaseFunction } from "./BaseFunction";
import { AdotFunction } from "./lambda/adot/infra";
import { Datadog } from "datadog-cdk-constructs-v2";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";

// import * as sqs from 'aws-cdk-lib/aws-sqs';
export class ColdStartPerfStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dummyDatabase = new TableV2(this, "OtelDatabase", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: { name: "id", type: cdk.aws_dynamodb.AttributeType.STRING },
      billing: Billing.onDemand(),
    });

    const functionToTest = new BaseFunction(this, "Function", {
      functionName: "otel-base",
      entry: "lib/lambda/base/handler.ts",
    }).function;

    const datadogToTest = new BaseFunction(this, "DatadogFunction", {
      functionName: "datadog-base",
      entry: "lib/lambda/base/handler.ts",
    }).function;
    const adotFunctionToTest = new AdotFunction(this, "AdotFunction").function;

    const xRayFunctionToTest = new BaseFunction(this, "XRayFunction", {
      functionName: "xray-base",
      entry: "lib/lambda/xray/handler.ts",
    }).function;

    const functionsToTest: NodejsFunction[] = [
      functionToTest,
      adotFunctionToTest,
      xRayFunctionToTest,
      datadogToTest
    ];

    functionsToTest.forEach((fn) => {
      fn.addEnvironment("TABLE_NAME", dummyDatabase.tableName);
      dummyDatabase.grantReadWriteData(fn);
    });

    new ColdStartPerfConstruct(this, "ColdStartPerfConstruct", {
      lambdaFunctions: functionsToTest,
      tableName: dummyDatabase.tableName,
    });


    const datadog = new Datadog(this, "Datadog", {
      nodeLayerVersion: 109,
      extensionLayerVersion: 57,
      site: "datadoghq.eu",
      apiKeySecretArn: "arn:aws:secretsmanager:eu-west-3:906407660701:secret:datadog-iSl7Ss"
    });
    const datdogSecret = Secret.fromSecretCompleteArn(this, "DatadogSecret", "arn:aws:secretsmanager:eu-west-3:906407660701:secret:datadog-iSl7Ss")
    datdogSecret.grantRead(datadogToTest)

    datadog.addLambdaFunctions([datadogToTest])
  }
}
