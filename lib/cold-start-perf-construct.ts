import * as cdk from "aws-cdk-lib";
import { PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";

export interface ColdStartPerfConstructProps {
  lambdaFunctions: lambda.Function[];
  tableName: string;
}

/**
 * A construct that creates a Step Functions state machine that invokes a list of Lambda functions.
 */
export class ColdStartPerfConstruct extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: ColdStartPerfConstructProps
  ) {
    super(scope, id);

    const logParserLambdaFunction = new NodejsFunction(
      this,
      "LogParserLambdaFunction",
      {
        entry: "lib/lambda/log-parser-handler.ts",
        runtime: lambda.Runtime.NODEJS_20_X,
        bundling: {
          sourceMap: true,
        },
        environment: {
          NODE_OPTIONS: "--enable-source-maps",
        }
      }
    );

    const fanOut = new sfn.Parallel(this, "All jobs");
    props.lambdaFunctions.forEach((lambdaFunction, index) => {
      fanOut.branch(
        new PerformanceTest(this, `Test-${index}`, {
          idSuffix: index,
          functionToTest: lambdaFunction,
          logParser: logParserLambdaFunction,
          tableName: props.tableName,
        }).chain
      );
    });

    const stateMachine = new sfn.StateMachine(
      this,
      "ColdStartPerfStateMachine",
      {
        definition: fanOut,
      }
    );

    stateMachine.addToRolePolicy(
      new PolicyStatement({
        actions: ["lambda:InvokeFunction"],
        resources: props.lambdaFunctions.map((fn) => fn.functionArn),
      })
    );
  }
}

class PerformanceTest extends Construct {
  public readonly chain: sfn.Chain;
  private readonly idSuffix: string;
  constructor(
    scope: Construct,
    id: string,
    props: {
      functionToTest: lambda.Function;
      logParser: lambda.Function;
      tableName: string;
      idSuffix: number;
    }
  ) {
    super(scope, id);
    const { functionToTest, logParser } = props;
    this.idSuffix = id;
    this.chain =

      this.updateLambdaFunctionEnvironmentVariableToCurrentTimestamp(
        functionToTest,
      )
        .next(this.waitForMs(1_000, `WaitForEnvVarUpdate-${functionToTest.functionName}`))
        .next(this.updateLambdaFunctionMemoryConfigTo(functionToTest, 128))
        .next(this.waitForMs(1_000, `WaitForMemoryUpdateTo128-${functionToTest.functionName}`))
        .next(this.invokeLambdaFunction(functionToTest, "InvokeLambdaFunctionAfterEnvVarUpdate"))
        .next(this.updateLambdaFunctionMemoryConfigTo(functionToTest, 1024))
        .next(this.waitForMs(1_000, `WaitForMemoryUpdate1024-${functionToTest.functionName}`))
        .next(this.invokeLambdaFunction(functionToTest, "InvokeLambdaFunctionAfterMemoryUpdate"))
    // .next(this.parseLogs(logParser));
  }
  uniqueId = (id: string) => {
    return `${id}-${this.idSuffix}`;
  };

  updateLambdaFunctionEnvironmentVariableToCurrentTimestamp(
    lambdaFunction: lambda.Function,
  ): tasks.CallAwsService {
    // make a AWS SDK call to update the Lambda function environment variable
    return new tasks.CallAwsService(this, this.uniqueId("UpdateEnvVars"), {
      service: "lambda",
      action: "updateFunctionConfiguration",

      parameters: {
        FunctionName: lambdaFunction.functionName,
        "Description.$": "$$.Execution.StartTime",

      },
      iamResources: [lambdaFunction.functionArn],
    });
  }

  updateLambdaFunctionMemoryConfigTo(
    lambdaFunction: lambda.Function,
    memorySize: number
  ): tasks.CallAwsService {
    // make a AWS SDK call to update the Lambda function environment variable
    return new tasks.CallAwsService(this, this.uniqueId(`SetMemoryTo${memorySize}`), {
      service: "lambda",
      action: "updateFunctionConfiguration",
      stateName: `SetMemoryTo${memorySize}-${lambdaFunction.functionName}`,

      parameters: {
        FunctionName: lambdaFunction.functionName,
        "MemorySize": memorySize,

      },
      iamResources: [lambdaFunction.functionArn],
    });
  }

  waitForMs(ms: number, id: string): sfn.Wait {
    return new sfn.Wait(this, this.uniqueId("Wait" + id), {
      stateName: `Wait ${ms}ms - ${id}`,
      time: sfn.WaitTime.duration(cdk.Duration.millis(ms)),
    });
  }

  invokeLambdaFunction(lambdaFunction: lambda.Function, id: string) {
    const step = new tasks.CallAwsService(
      this,
      this.uniqueId("InvokeLambdaFunction" + id),
      {
        stateName: `Invoke ${lambdaFunction.functionName} - ${id}`,
        service: "lambda",
        action: "invoke",
        parameters: {
          FunctionName: lambdaFunction.functionName,
          Payload: {},
          LogType: "Tail",
        },
        iamResources: [lambdaFunction.functionArn],
      }
    );
    return step;
  }

  parseLogs(parseLogsLambdaFunction: lambda.Function) {
    const task = new tasks.LambdaInvoke(this, this.uniqueId("ParseLogs"), {
      lambdaFunction: parseLogsLambdaFunction,
      payload: sfn.TaskInput.fromObject({
        LogResult: sfn.JsonPath.stringAt("$.LogResult"),
      }),
    });
    return task;
  }
}
