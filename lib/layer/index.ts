import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3assets from "aws-cdk-lib/aws-s3-assets";
import { Construct } from "constructs";
import * as fs from "fs";

interface LayerProps {
  runtime: lambda.Runtime;
  architecture: lambda.Architecture;
  path: string;
  autoUpgrade?: boolean;
}

export class Layer extends Construct {
  public layer: lambda.LayerVersion;

  constructor(scope: Construct, id: string, props: LayerProps) {
    super(scope, id);

    const { runtime, architecture, path, autoUpgrade } = props;

    const args = ["-t /asset-output/python", "--no-cache-dir"];
    if (autoUpgrade) {
      args.push("--upgrade");
    }

    const layerAsset = new s3assets.Asset(this, "LayerAsset", {
      path,
      bundling: {
        image: runtime.bundlingImage,
        platform: architecture.dockerPlatform,
        command: [
          "bash",
          "-c",
          [
            `pip install -r requirements.txt ${args.join(" ")}`,
            `cd /asset-output/python`,
            // Remove sqlalchemy, used by Langchain when storing the memory using sql
            `rm -rf sqlalchemy*`,
            // Main impact of cold start is the file size. (faster to have the lambda regenerate them)
            `find . -name "*.pyc" -type f -delete`,
            `cd -`,
          ].join(" && "),
        ],
        outputType: cdk.BundlingOutput.AUTO_DISCOVER,
        securityOpt: "no-new-privileges:true",
        network: "host",
      },
    });

    const layer = new lambda.LayerVersion(this, "Layer", {
      code: lambda.Code.fromBucket(layerAsset.bucket, layerAsset.s3ObjectKey),
      compatibleRuntimes: [runtime],
      compatibleArchitectures: [architecture],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.layer = layer;
  }
}

interface CaCertLayerProps {
  runtimes: lambda.Runtime[];
  architecture: lambda.Architecture;
  path: string;
  caCerts: string;
  autoUpgrade?: boolean;
}
export class CaCertLayer extends Construct {
  public layer: lambda.LayerVersion;
  constructor(scope: Construct, id: string, props: CaCertLayerProps) {
    super(scope, id);

    const { runtimes, architecture, path, caCerts, autoUpgrade } = props;

    const args = ["-t /asset-output/python", "--no-cache-dir"];
    if (autoUpgrade) {
      args.push("--upgrade");
    }

    // Read the cert file contents synchronously
    const certText = fs.readFileSync(caCerts, "utf-8");

    const layerAsset = new s3assets.Asset(this, "CaCertLayerAssest", {
      path,
      bundling: {
        image: lambda.Runtime.PYTHON_3_11.bundlingImage,
        platform: architecture.dockerPlatform,
        command: [
          "bash",
          "-c",
          [
            // create custom bundled CA certs
            `pip install certifi ${args.join(" ")}`,
            `echo "${certText}" >> /asset-output/python/certifi/cacert.pem`,
            `mv /asset-output/python/certifi/cacert.pem /asset-output/cacert.pem`,
            `rm -rf /asset-output/python`,
          ].join(" && "),
        ],
        outputType: cdk.BundlingOutput.NOT_ARCHIVED,
        securityOpt: "no-new-privileges:true",
        network: "host",
      },
    });

    const layer = new lambda.LayerVersion(this, "CaCertLayer", {
      code: lambda.Code.fromBucket(layerAsset.bucket, layerAsset.s3ObjectKey),
      compatibleRuntimes: runtimes,
      compatibleArchitectures: [architecture],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    this.layer = layer;
  }
}
