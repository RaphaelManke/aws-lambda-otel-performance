import { Construct } from "constructs";
import { ColdStartPerfConstruct } from "../cold-start-perf-construct";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

interface RunnerProps {
  // define properties here
}

export class Runner extends Construct {
  constructor(scope: Construct, id: string, props: RunnerProps) {
    super(scope, id);
  }
}
