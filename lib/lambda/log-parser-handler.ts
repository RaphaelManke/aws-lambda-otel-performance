import { Logger } from "@aws-lambda-powertools/logger";

type Base64String = string;
interface Event {
  ExecutedVersion: string;
  LogResult: Base64String;
  Payload: any;
  StatusCode: number;
}

export interface InitReportLog {
  time: string;
  type: string;
  record: InitReportRecord;
}

export interface InitReportRecord {
  initializationType: string;
  phase: string;
  runtimeVersion: string;
  runtimeVersionArn: string;
  functionName: string;
  functionVersion: string;
}

export interface ReportMetricsLog {
  time: string;
  type: string;
  record: InitReportRecord;
}

export interface InitReportRecord {
  requestId: string;
  status: string;
  metrics: Metrics;
}

export interface Metrics {
  durationMs: number;
  billedDurationMs: number;
  memorySizeMB: number;
  maxMemoryUsedMB: number;
  initDurationMs: number;
}
const logger = new Logger({ serviceName: "log-parser" });

export const handler = (event: Event) => {
  /**
     * {"time":"2024-05-20T16:29:44.833Z","type":"platform.initStart","record":{"initializationType":"on-demand","phase":"init","runtimeVersion":"nodejs:18.v28","runtimeVersionArn":"arn:aws:lambda:eu-west-3::runtime:b475b23763329123d9e6f79f51886d0e1054f727f5b90ec945fcb2a3ec09afdd","functionName":"ColdStartPerfStack-Function76856677-qnwBXhjb6klt","functionVersion":"$LATEST"}}
{"time":"2024-05-20T16:29:45.006Z","type":"platform.initRuntimeDone","record":{"initializationType":"on-demand","phase":"init","status":"success"}}
{"time":"2024-05-20T16:29:45.007Z","type":"platform.initReport","record":{"initializationType":"on-demand","phase":"init","status":"success","metrics":{"durationMs":173.778}}}
{"time":"2024-05-20T16:29:45.008Z","type":"platform.start","record":{"requestId":"4b142fc3-17b8-4cdb-a46b-a8dbe7918715","version":"$LATEST"}}
{"timestamp":"2024-05-20T16:29:45.009Z","level":"INFO","requestId":"4b142fc3-17b8-4cdb-a46b-a8dbe7918715","message":"ENV 2024-05-20T16:29:42.891Z"}
{"time":"2024-05-20T16:29:45.019Z","type":"platform.runtimeDone","record":{"requestId":"4b142fc3-17b8-4cdb-a46b-a8dbe7918715","status":"success","spans":[{"name":"responseLatency","start":"2024-05-20T16:29:45.008Z","durationMs":2.215},{"name":"responseDuration","start":"2024-05-20T16:29:45.010Z","durationMs":0.056},{"name":"runtimeOverhead","start":"2024-05-20T16:29:45.010Z","durationMs":8.686}],"metrics":{"durationMs":11.185,"producedBytes":40}}}
{"time":"2024-05-20T16:29:45.022Z","type":"platform.report","record":{"requestId":"4b142fc3-17b8-4cdb-a46b-a8dbe7918715","status":"success","metrics":{"durationMs":11.642,"billedDurationMs":12,"memorySizeMB":128,"maxMemoryUsedMB":67,"initDurationMs":174.055}}}
     */
  const parsedLogResult = Buffer.from(event.LogResult, "base64").toString();
  const logLines = parsedLogResult.split("\n");
  const logStatements = logLines.map((line) => JSON.parse(line));

  const initReport: InitReportLog = logStatements.find(
    (statement) => statement.type === "platform.initStart"
  );

  const reportMetrics: ReportMetricsLog = logStatements.find(
    (statement) => statement.type === "platform.report"
  );

  const resultMetrics = {
    ...reportMetrics.record.metrics,
    requestId: reportMetrics.record.requestId,
    functionName: initReport.record.functionName,
    runtimeVersion: initReport.record.runtimeVersion,
  };
  logger.info("reportMetrics", resultMetrics);

  return resultMetrics;
};
