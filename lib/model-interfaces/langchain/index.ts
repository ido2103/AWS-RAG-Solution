import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as logs from "aws-cdk-lib/aws-logs";
import { CfnEndpoint } from "aws-cdk-lib/aws-sagemaker";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as appsync from "aws-cdk-lib/aws-appsync";
import { Construct } from "constructs";
import * as path from "path";
import { RagEngines } from "../../rag-engines";
import { Shared } from "../../shared";
import { SystemConfig } from "../../shared/types";
import { AURORA_DB_USERS } from "../../rag-engines/aurora-pgvector";

interface LangChainInterfaceProps {
  readonly shared: Shared;
  readonly config: SystemConfig;
  readonly ragEngines?: RagEngines;
  readonly messagesTopic: sns.Topic;
  readonly sessionsTable: dynamodb.Table;
  readonly byUserIdIndex: string;
  readonly applicationTable: dynamodb.Table;
  readonly chatbotFilesBucket: s3.Bucket;
  readonly graphqlApi: appsync.GraphqlApi;
}

export class LangChainInterface extends Construct {
  public readonly ingestionQueue: sqs.Queue;
  public readonly requestHandler: lambda.Function;

  constructor(scope: Construct, id: string, props: LangChainInterfaceProps) {
    super(scope, id);

    const requestHandler = new lambda.Function(this, "RequestHandler", {
      vpc: props.shared.vpc,
      code: props.shared.sharedCode.bundleWithLambdaAsset(
        path.join(__dirname, "./functions/request-handler")
      ),
      handler: "index.handler",
      description: "Langchain request handler",
      runtime: props.shared.pythonRuntime,
      architecture: props.shared.lambdaArchitecture,
      tracing: props.config.advancedMonitoring
        ? lambda.Tracing.ACTIVE
        : lambda.Tracing.DISABLED,
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      logRetention: props.config.logRetention ?? logs.RetentionDays.ONE_WEEK,
      loggingFormat: lambda.LoggingFormat.JSON,
      layers: [
        props.shared.powerToolsLayer,
        props.shared.commonLayer,
        ...(props.shared.caCertLayer ? [props.shared.caCertLayer] : []),
      ],
      environment: {
        ...props.shared.defaultEnvironmentVariables,
        CHATBOT_FILES_BUCKET_NAME: props.chatbotFilesBucket.bucketName,
        CONFIG_PARAMETER_NAME: props.shared.configParameter.parameterName,
        SESSIONS_TABLE_NAME: props.sessionsTable.tableName,
        SESSIONS_BY_USER_ID_INDEX_NAME: props.byUserIdIndex,
        APPLICATIONS_TABLE_NAME: props.applicationTable.tableName,
        API_KEYS_SECRETS_ARN: props.shared.apiKeysSecret.secretArn,
        MESSAGES_TOPIC_ARN: props.messagesTopic.topicArn,
        APPSYNC_ENDPOINT: props.graphqlApi.graphqlUrl,
        DIRECT_SEND: props.config.directSend ? "true" : "false",
        WORKSPACES_TABLE_NAME:
          props.ragEngines?.workspacesTable.tableName ?? "",
        WORKSPACES_BY_OBJECT_TYPE_INDEX_NAME:
          props.ragEngines?.workspacesByObjectTypeIndexName ?? "",
        AURORA_DB_USER: AURORA_DB_USERS.READ_ONLY,
        AURORA_DB_HOST:
          props.ragEngines?.auroraPgVector?.database?.clusterEndpoint
            ?.hostname ?? "",
        AURORA_DB_PORT:
          props.ragEngines?.auroraPgVector?.database?.clusterEndpoint?.port +
          "",
        SAGEMAKER_RAG_MODELS_ENDPOINT:
          props.ragEngines?.sageMakerRagModels?.model?.endpoint
            ?.attrEndpointName ?? "",
        OPEN_SEARCH_COLLECTION_ENDPOINT:
          props.ragEngines?.openSearchVector?.openSearchCollectionEndpoint ??
          "",
        DEFAULT_KENDRA_INDEX_ID:
          props.ragEngines?.kendraRetrieval?.kendraIndex?.attrId ?? "",
        DEFAULT_KENDRA_INDEX_NAME:
          props.ragEngines?.kendraRetrieval?.kendraIndex?.name ?? "",
        DEFAULT_KENDRA_S3_DATA_SOURCE_ID:
          props.ragEngines?.kendraRetrieval?.kendraS3DataSource?.attrId ?? "",
        DEFAULT_KENDRA_S3_DATA_SOURCE_BUCKET_NAME:
          props.ragEngines?.kendraRetrieval?.kendraS3DataSourceBucket
            ?.bucketName ?? "",
      },
    });

    props.chatbotFilesBucket.grantReadWrite(requestHandler);

    if (props.config.bedrock?.enabled) {
      requestHandler.addToRolePolicy(
        new iam.PolicyStatement({
          actions: [
            "bedrock:InvokeModel",
            "bedrock:ApplyGuardrail",
            "bedrock:InvokeModelWithResponseStream",
          ],
          resources: ["*"],
        })
      );

      if (props.config.bedrock?.roleArn) {
        requestHandler.addToRolePolicy(
          new iam.PolicyStatement({
            actions: ["sts:AssumeRole"],
            resources: [props.config.bedrock.roleArn],
          })
        );
      }
    }

    if (props.config.bedrock?.guardrails?.enabled) {
      requestHandler.addEnvironment(
        "BEDROCK_GUARDRAILS_ID",
        props.config.bedrock.guardrails.identifier
      );
      requestHandler.addEnvironment(
        "BEDROCK_GUARDRAILS_VERSION",
        props.config.bedrock.guardrails.version
      );
    }

    if (props.ragEngines?.auroraPgVector) {
      props.ragEngines.auroraPgVector.database.grantConnect(
        requestHandler,
        AURORA_DB_USERS.READ_ONLY
      );
      props.ragEngines?.auroraPgVector.database.connections.allowDefaultPortFrom(
        requestHandler
      );
    }

    if (props.ragEngines?.openSearchVector) {
      requestHandler.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ["aoss:APIAccessAll"],
          resources: [
            props.ragEngines?.openSearchVector.openSearchCollection.attrArn,
          ],
        })
      );

      props.ragEngines.openSearchVector.addToAccessPolicy(
        "request-handler-langchain",
        [requestHandler.role?.roleArn],
        ["aoss:ReadDocument", "aoss:WriteDocument"]
      );
    }

    if (props.ragEngines) {
      props.ragEngines.workspacesTable.grantReadWriteData(requestHandler);
      props.ragEngines.documentsTable.grantReadWriteData(requestHandler);
    }

    if (props.ragEngines?.sageMakerRagModels?.model) {
      requestHandler.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ["sagemaker:InvokeEndpoint"],
          resources: [props.ragEngines.sageMakerRagModels.model.endpoint.ref],
        })
      );
    }

    if (props.ragEngines?.kendraRetrieval) {
      props.ragEngines?.kendraRetrieval?.kendraS3DataSourceBucket?.grantRead(
        requestHandler
      );

      if (props.ragEngines.kendraRetrieval.kendraIndex) {
        requestHandler.addToRolePolicy(
          new iam.PolicyStatement({
            actions: ["kendra:Retrieve", "kendra:Query"],
            resources: [props.ragEngines.kendraRetrieval.kendraIndex.attrArn],
          })
        );
      }

      for (const item of props.config.rag.engines.kendra.external || []) {
        if (item.roleArn) {
          requestHandler.addToRolePolicy(
            new iam.PolicyStatement({
              actions: ["sts:AssumeRole"],
              resources: [item.roleArn],
            })
          );
        } else {
          requestHandler.addToRolePolicy(
            new iam.PolicyStatement({
              actions: ["kendra:Retrieve", "kendra:Query"],
              resources: [
                `arn:${cdk.Aws.PARTITION}:kendra:${
                  item.region ?? cdk.Aws.REGION
                }:${cdk.Aws.ACCOUNT_ID}:index/${item.kendraId}`,
              ],
            })
          );
        }
      }
    }

    if (props.config.rag.engines.knowledgeBase?.enabled) {
      for (const item of props.config.rag.engines.knowledgeBase.external ||
        []) {
        if (item.roleArn) {
          requestHandler.addToRolePolicy(
            new iam.PolicyStatement({
              actions: ["sts:AssumeRole"],
              resources: [item.roleArn],
            })
          );
        } else {
          requestHandler.addToRolePolicy(
            new iam.PolicyStatement({
              actions: ["bedrock:Retrieve"],
              resources: [
                `arn:${cdk.Aws.PARTITION}:bedrock:${
                  item.region ?? cdk.Aws.REGION
                }:${cdk.Aws.ACCOUNT_ID}:knowledge-base/${item.knowledgeBaseId}`,
              ],
            })
          );
        }
      }
    }
    props.graphqlApi.grantMutation(requestHandler);
    props.graphqlApi.grantQuery(requestHandler);
    props.sessionsTable.grantReadWriteData(requestHandler);
    props.applicationTable.grantReadWriteData(requestHandler);
    props.messagesTopic.grantPublish(requestHandler);
    if (props.shared.kmsKey && requestHandler.role) {
      props.shared.kmsKey.grantEncrypt(requestHandler.role);
    }
    props.shared.apiKeysSecret.grantRead(requestHandler);
    props.shared.configParameter.grantRead(requestHandler);

    // Add Amazon Bedrock permissions to the IAM role for the Lambda function
    requestHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:*", "bedrock:InvokeModelWithResponseStream"],
        resources: ["*"],
      })
    );

    requestHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "comprehend:DetectDominantLanguage",
          "comprehend:DetectSentiment",
        ],
        resources: ["*"],
      })
    );

    const deadLetterQueue = new sqs.Queue(this, "DLQ", {
      encryption: props.shared.kmsKey ? sqs.QueueEncryption.KMS : undefined,
      encryptionMasterKey: props.shared.kmsKey,
      enforceSSL: true,
    });

    const queue = new sqs.Queue(this, "LangChainIngestionQueue", {
      encryption: props.shared.queueKmsKey
        ? sqs.QueueEncryption.KMS
        : undefined,
      encryptionMasterKey: props.shared.queueKmsKey,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      // https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#events-sqs-queueconfig
      visibilityTimeout: cdk.Duration.minutes(15 * 6),
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 3,
      },
      enforceSSL: true,
    });

    queue.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["sqs:SendMessage"],
        resources: [queue.queueArn],
        principals: [
          new iam.ServicePrincipal("events.amazonaws.com"),
          new iam.ServicePrincipal("sqs.amazonaws.com"),
        ],
      })
    );

    if (props.config.provisionedConcurrency) {
      const aliasOptions: lambda.AliasProps = {
        aliasName: "live",
        version: requestHandler.currentVersion,
        provisionedConcurrentExecutions: props.config.provisionedConcurrency,
        description: `alias with ${props.config.provisionedConcurrency} provisioned concurrent executions`,
      };
      const alias = new lambda.Alias(this, "RequestHandlerAlias", aliasOptions);
      alias.addEventSource(new lambdaEventSources.SqsEventSource(queue));
    } else {
      requestHandler.addEventSource(
        new lambdaEventSources.SqsEventSource(queue)
      );
    }

    this.ingestionQueue = queue;
    this.requestHandler = requestHandler;
  }

  public addSageMakerEndpoint({
    endpoint,
    name,
  }: {
    endpoint: CfnEndpoint;
    name: string;
  }) {
    this.requestHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["sagemaker:InvokeEndpoint"],
        resources: [endpoint.ref],
      })
    );
    const cleanName = name.replace(/[\s./\-_]/g, "").toUpperCase();
    this.requestHandler.addEnvironment(
      `SAGEMAKER_ENDPOINT_${cleanName}`,
      endpoint.attrEndpointName
    );
  }
}
