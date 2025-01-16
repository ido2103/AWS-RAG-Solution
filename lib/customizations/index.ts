import { Construct } from "constructs";
import { CognitoPrivateProxy } from "./cognito-private-proxy";
import { Shared } from "../shared";
import { SystemConfig } from "../shared/types";

export interface CustomizationsProps {
  readonly shared: Shared;
  readonly config: SystemConfig;
}

export class Customizations extends Construct {
  constructor(scope: Construct, id: string, props: CustomizationsProps) {
    super(scope, id);
  }
}
