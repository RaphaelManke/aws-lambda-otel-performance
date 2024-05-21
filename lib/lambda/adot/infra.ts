import { Construct } from "constructs";
import { BaseFunction } from "../../BaseFunction";
import { AdotLambdaExecWrapper, AdotLambdaLayerJavaScriptSdkVersion, AdotLayerVersion } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

export class AdotFunction extends Construct {
    public readonly function: NodejsFunction;
    constructor(scope: Construct, id: string) {
        super(scope, id);
        this.function = new BaseFunction(this, "AdotFunction", {
            functionName: "otel-adot-lambda",
            entry: "lib/lambda/adot/handler.ts",
            adotInstrumentation: {
                execWrapper: AdotLambdaExecWrapper.REGULAR_HANDLER,
                layerVersion: AdotLayerVersion.fromJavaScriptSdkLayerVersion(AdotLambdaLayerJavaScriptSdkVersion.LATEST),
            }
        }).function;
    }
}