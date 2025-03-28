import * as cdk from "aws-cdk-lib";
import * as appsync from "aws-cdk-lib/aws-appsync";
import {
  Code,
  Function as LambdaFunction,
  LayerVersion,
  LoggingFormat,
  Tracing,
  Runtime,
  AliasProps,
  Alias,
} from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Construct } from "constructs";
import { Shared } from "../shared";
import { IQueue } from "aws-cdk-lib/aws-sqs";
import { ITopic } from "aws-cdk-lib/aws-sns";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";
import { IKey } from "aws-cdk-lib/aws-kms";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

interface RealtimeResolversProps {
  readonly queue: IQueue;
  readonly topic: ITopic;
  readonly provisionedConcurrency?: number;
  readonly topicKey: IKey;
  readonly userPool: UserPool;
  readonly shared: Shared;
  readonly api: appsync.GraphqlApi;
  readonly logRetention?: number;
  readonly advancedMonitoring?: boolean;
  readonly applicationTable: dynamodb.Table;
}

export class RealtimeResolvers extends Construct {
  public readonly sendQueryHandler: LambdaFunction;
  public readonly outgoingMessageHandler: LambdaFunction;

  constructor(scope: Construct, id: string, props: RealtimeResolversProps) {
    super(scope, id);

    const powertoolsLayerJS = LayerVersion.fromLayerVersionArn(
      this,
      "PowertoolsLayerJS",
      `arn:aws:lambda:${
        cdk.Stack.of(this).region
      }:094274105915:layer:AWSLambdaPowertoolsTypeScript:22`
    );

    const resolverFunction = new LambdaFunction(this, "lambda-resolver", {
      code: Code.fromAsset(
        "./lib/chatbot-api/functions/resolvers/send-query-lambda-resolver"
      ),
      handler: "index.handler",
      description: `Appsync resolver handling LLM Queries updated on ${Date.now()}`,
      runtime: Runtime.PYTHON_3_11,
      tracing: props.advancedMonitoring ? Tracing.ACTIVE : Tracing.DISABLED,
      environment: {
        ...props.shared.defaultEnvironmentVariables,
        SNS_TOPIC_ARN: props.topic.topicArn,
        APPLICATIONS_TABLE_NAME: props.applicationTable.tableName,
      },
      logRetention: props.logRetention,
      loggingFormat: LoggingFormat.JSON,
      layers: [
        props.shared.powerToolsLayer,
        props.shared.commonLayer,
        ...(props.shared.caCertLayer ? [props.shared.caCertLayer] : []),
      ],
      vpc: props.shared.vpc,
    });

    const outgoingMessageHandler = new NodejsFunction(
      this,
      "outgoing-message-handler",
      {
        entry: path.join(
          __dirname,
          "functions/outgoing-message-appsync/index.ts"
        ),
        bundling: {
          externalModules: ["aws-xray-sdk-core", "@aws-sdk"],
        },
        layers: [
          powertoolsLayerJS,
          ...(props.shared.caCertLayer ? [props.shared.caCertLayer] : []),
        ],
        handler: "index.handler",
        description: `Sends LLM Responses to Appsync ${Date.now()}`,
        runtime: Runtime.NODEJS_18_X,
        loggingFormat: LoggingFormat.JSON,
        tracing: props.advancedMonitoring ? Tracing.ACTIVE : Tracing.DISABLED,
        logRetention: props.logRetention,
        environment: {
          ...props.shared.defaultEnvironmentVariables,
          GRAPHQL_ENDPOINT: props.api.graphqlUrl,
          COGNITO_USER_POOL_ID: props.userPool.userPoolId,
        },
        vpc: props.shared.vpc,
      }
    );

    if (props.provisionedConcurrency) {
      const aliasOptions: AliasProps = {
        aliasName: "live",
        version: outgoingMessageHandler.currentVersion,
        provisionedConcurrentExecutions: props.provisionedConcurrency,
        description: `alias with ${props.provisionedConcurrency} provisioned concurrent executions`,
      };
      const alias = new Alias(this, "OutgoingMessageHandler", aliasOptions);
      alias.addEventSource(new SqsEventSource(props.queue));
    } else {
      outgoingMessageHandler.addEventSource(new SqsEventSource(props.queue));
    }

    props.topic.grantPublish(resolverFunction);
    if (props.topicKey && resolverFunction.role) {
      props.topicKey.grant(
        resolverFunction.role,
        "kms:GenerateDataKey",
        "kms:Decrypt"
      );
    }

    props.applicationTable.grantReadData(resolverFunction);

    let functionDataSource;
    if (props.provisionedConcurrency) {
      const aliasOptions: AliasProps = {
        aliasName: "live",
        version: resolverFunction.currentVersion,
        provisionedConcurrentExecutions: props.provisionedConcurrency,
        description: `alias with ${props.provisionedConcurrency} provisioned concurrent executions`,
      };
      const alias = new Alias(this, "LambdaResolberAlias", aliasOptions);
      functionDataSource = props.api.addLambdaDataSource(
        "realtimeResolverFunction",
        alias
      );
    } else {
      functionDataSource = props.api.addLambdaDataSource(
        "realtimeResolverFunction",
        resolverFunction
      );
    }
    const noneDataSource = props.api.addNoneDataSource("none", {
      name: "relay-source",
    });

    props.api.createResolver("send-message-resolver", {
      typeName: "Mutation",
      fieldName: "sendQuery",
      dataSource: functionDataSource,
    });

    props.api.createResolver("publish-response-resolver", {
      typeName: "Mutation",
      fieldName: "publishResponse",
      code: appsync.Code.fromAsset(
        "./lib/chatbot-api/functions/resolvers/publish-response-resolver.js"
      ),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
      dataSource: noneDataSource,
    });

    props.api.createResolver("subscription-resolver", {
      typeName: "Subscription",
      fieldName: "receiveMessages",
      code: appsync.Code.fromAsset(
        "./lib/chatbot-api/functions/resolvers/subscribe-resolver.js"
      ),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
      dataSource: noneDataSource,
    });

    this.sendQueryHandler = resolverFunction;
    this.outgoingMessageHandler = outgoingMessageHandler;
  }
}
