import { SelectProps } from "@cloudscape-design/components";
import { CognitoHostedUIIdentityProvider } from "@aws-amplify/auth";

export interface AppConfig {
  aws_project_region: string;
  aws_user_pools_id: string;
  aws_user_pools_web_client_id: string;
  config: {
    auth_federated_provider?:
      | { auto_redirect: boolean; custom: true; name: string }
      | {
          auto_redirect: boolean;
          custom: false;
          name: CognitoHostedUIIdentityProvider;
        };
    oauth?: {
      domain: string;
      redirectSignIn: string;
      redirectSignOut: string;
      Scopes: [];
      responseType: string;
    };
    rag_enabled: boolean;
    cross_encoders_enabled: boolean;
    sagemaker_embeddings_enabled: boolean;
    api_endpoint: string;
    websocket_endpoint: string;
    default_embeddings_model: string;
    default_cross_encoder_model: string;
    privateWebsite: boolean;
    locale?: string;
  };
}

export interface NavigationPanelState {
  collapsed?: boolean;
  collapsedSections?: Record<number, boolean>;
}

export type LoadingStatus = "pending" | "loading" | "finished" | "error";
export type ModelProvider = "sagemaker" | "bedrock" | "openai";
export type RagDocumentType =
  | "file"
  | "text"
  | "qna"
  | "website"
  | "rssfeed"
  | "rsspost";
export type Modality = "TEXT" | "IMAGE" | "VIDEO";
export type ModelInterface = "langchain" | "multimodal";

export interface DocumentSubscriptionToggleResult {
  id: string;
  workspaceId: string;
  status: string;
}

export enum DocumentSubscriptionStatus {
  ENABLED = "enabled",
  DISABLED = "disabled",
  UNKNOWN = "unknown",
  DEFAULT = UNKNOWN,
}

export enum UserRole {
  ADMIN = "admin",
  WORKSPACE_MANAGER = "workspace_manager",
  USER = "user",
}

export interface AuroraWorkspaceCreateInput {
  name: string;
  embeddingsModel: SelectProps.Option | null;
  crossEncoderModel: SelectProps.Option | null;
  languages: readonly SelectProps.Option[];
  metric: string;
  index: boolean;
  hybridSearch: boolean;
  chunkingStrategy: "recursive" | "file_level";
  chunkSize: number;
  chunkOverlap: number;
}

export interface OpenSearchWorkspaceCreateInput {
  name: string;
  embeddingsModel: SelectProps.Option | null;
  crossEncoderModel: SelectProps.Option | null;
  languages: readonly SelectProps.Option[];
  hybridSearch: boolean;
  chunkingStrategy: "recursive" | "file_level";
  chunkSize: number;
  chunkOverlap: number;
}

export interface KendraWorkspaceCreateInput {
  name: string;
  kendraIndex: SelectProps.Option | null;
  useAllData: boolean;
}

export interface BedrockKBWorkspaceCreateInput {
  name: string;
  knowledgeBaseId: SelectProps.Option | null;
  hybridSearch: boolean;
}

export interface ApplicationManageInput {
  id?: string;
  name: string;
  systemPrompt: string;
  systemPromptRag: string;
  condenseSystemPrompt: string;
  selectedRoles: readonly SelectProps.Option[];
  selectedModel: SelectProps.Option | null;
  selectedWorkspace: SelectProps.Option | null;
  allowImageInput: boolean;
  allowDocumentInput: boolean;
  allowVideoInput: boolean;
  enableGuardrails: boolean;
  createTime?: string;
  streaming: boolean;
  maxTokens: number;
  temperature: number;
  topP: number;
  seed: number;
}
