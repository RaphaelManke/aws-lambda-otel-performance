import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { LoggingFormat, Runtime, Tracing } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";
import { ILogGroup, LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export interface BaseFunctionProps extends NodejsFunctionProps {
    functionName: string;
    entry: string;
}
export class BaseFunction extends Construct {
    public readonly function: NodejsFunction;
    constructor(scope: Construct, id: string, props: BaseFunctionProps) {
        super(scope, id);
        const testFunctionGroup = new LogGroup(
            this,
            "FunctionLogGroup",

            {
                logGroupName: `/aws/lambda/${props.functionName}`,
                removalPolicy: RemovalPolicy.DESTROY,
                retention: RetentionDays.ONE_MONTH,
            }
        );
        this.function = new NodejsFunction(this, "Default", {
            ...props,
            logGroup: testFunctionGroup,
            runtime: Runtime.NODEJS_20_X,
            timeout: Duration.seconds(30),
            logFormat: LoggingFormat.JSON,
            tracing: Tracing.ACTIVE,
        });
    }
}
