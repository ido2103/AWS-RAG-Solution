from typing import Annotated, List, Optional
from common.constant import (
    SAFE_SHORT_STR_VALIDATION,
    SAFE_SHORT_STR_VALIDATION_OPTIONAL,
)
from common.validation import WorkspaceIdValidation
import genai_core.types
import genai_core.kendra
import genai_core.bedrock_kb
import genai_core.parameters
import genai_core.workspaces
from pydantic import BaseModel, Field
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler.appsync import Router
from genai_core.auth import UserPermissions

tracer = Tracer()
router = Router()
logger = Logger()
permissions = UserPermissions(router)

name_regex = r"^[\\u0590-\\u05FF\\uFB1D-\\uFB4F\\uFB50-\\uFDFF\\uFE70-\\uFEFFA-Za-z0-9-_./\\\\ ]*$"


class GenericCreateWorkspaceRequest(BaseModel):
    kind: str = SAFE_SHORT_STR_VALIDATION


class CreateWorkspaceAuroraRequest(BaseModel):
    kind: str = SAFE_SHORT_STR_VALIDATION
    name: str = Field(min_length=1, max_length=100, pattern=name_regex)
    embeddingsModelProvider: str = SAFE_SHORT_STR_VALIDATION
    embeddingsModelName: str = Field(
        min_length=0, max_length=500, pattern=r"^[A-Za-z0-9-_. /:]*$", default=None
    )
    crossEncoderModelProvider: Optional[str] = SAFE_SHORT_STR_VALIDATION_OPTIONAL
    crossEncoderModelName: Optional[str] = Field(
        min_length=0, max_length=500, pattern=r"^[A-Za-z0-9-_. /:]*$", default=None
    )
    languages: List[Annotated[str, SAFE_SHORT_STR_VALIDATION]]
    metric: str = SAFE_SHORT_STR_VALIDATION
    index: bool
    hybridSearch: bool
    chunkingStrategy: str = SAFE_SHORT_STR_VALIDATION
    chunkSize: int = Field(gt=100)
    chunkOverlap: int = Field(gt=0)


class CreateWorkspaceOpenSearchRequest(BaseModel):
    kind: str = SAFE_SHORT_STR_VALIDATION
    name: str = Field(min_length=1, max_length=100, pattern=name_regex)
    embeddingsModelProvider: str = SAFE_SHORT_STR_VALIDATION
    embeddingsModelName: str = Field(
        min_length=0, max_length=500, pattern=r"^[A-Za-z0-9-_. /:]*$", default=None
    )
    crossEncoderModelProvider: Optional[str] = SAFE_SHORT_STR_VALIDATION_OPTIONAL
    crossEncoderModelName: Optional[str] = Field(
        min_length=0, max_length=500, pattern=r"^[A-Za-z0-9-_. /:]*$", default=None
    )
    languages: List[Annotated[str, SAFE_SHORT_STR_VALIDATION]]
    hybridSearch: bool
    chunkingStrategy: str = SAFE_SHORT_STR_VALIDATION
    chunkSize: int = Field(gt=0)
    chunkOverlap: int = Field(gt=0)


class CreateWorkspaceKendraRequest(BaseModel):
    kind: str = SAFE_SHORT_STR_VALIDATION
    name: str = Field(min_length=1, max_length=100, pattern=name_regex)
    kendraIndexId: str = SAFE_SHORT_STR_VALIDATION
    useAllData: bool


class CreateWorkspaceBedrockKBRequest(BaseModel):
    kind: str = SAFE_SHORT_STR_VALIDATION
    name: str = SAFE_SHORT_STR_VALIDATION
    knowledgeBaseId: str = SAFE_SHORT_STR_VALIDATION
    hybridSearch: bool


@router.resolver(field_name="listWorkspaces")
@tracer.capture_method
@permissions.approved_roles(
    [permissions.ADMIN_ROLE, permissions.WORKSPACES_MANAGER_ROLE]
)
def list_workspaces():
    workspaces = genai_core.workspaces.list_workspaces()
    ret_value = [_convert_workspace(workspace) for workspace in workspaces]

    return ret_value


@router.resolver(field_name="getWorkspace")
@tracer.capture_method
@permissions.approved_roles(
    [permissions.ADMIN_ROLE, permissions.WORKSPACES_MANAGER_ROLE]
)
def get_workspace(workspaceId: id):
    WorkspaceIdValidation(**{"workspaceId": workspaceId})

    workspace = genai_core.workspaces.get_workspace(workspaceId)
    if not workspace:
        return None
    ret_value = _convert_workspace(workspace)
    return ret_value


@router.resolver(field_name="deleteWorkspace")
@tracer.capture_method
@permissions.approved_roles(
    [permissions.ADMIN_ROLE, permissions.WORKSPACES_MANAGER_ROLE]
)
def delete_workspace(workspaceId: str):
    WorkspaceIdValidation(**{"workspaceId": workspaceId})
    genai_core.workspaces.delete_workspace(workspaceId)


@router.resolver(field_name="createAuroraWorkspace")
@tracer.capture_method
@permissions.approved_roles(
    [permissions.ADMIN_ROLE, permissions.WORKSPACES_MANAGER_ROLE]
)
def create_aurora_workspace(input: dict):
    request = CreateWorkspaceAuroraRequest(**input)

    config = genai_core.parameters.get_config()
    ret_value = _create_workspace_aurora(request, config)
    return ret_value


@router.resolver(field_name="createOpenSearchWorkspace")
@tracer.capture_method
@permissions.approved_roles(
    [permissions.ADMIN_ROLE, permissions.WORKSPACES_MANAGER_ROLE]
)
def create_open_search_workspace(input: dict):
    config = genai_core.parameters.get_config()

    request = CreateWorkspaceOpenSearchRequest(**input)
    ret_value = _create_workspace_open_search(request, config)
    return ret_value


@router.resolver(field_name="createKendraWorkspace")
@tracer.capture_method
@permissions.approved_roles(
    [permissions.ADMIN_ROLE, permissions.WORKSPACES_MANAGER_ROLE]
)
def create_kendra_workspace(input: dict):
    config = genai_core.parameters.get_config()

    request = CreateWorkspaceKendraRequest(**input)
    ret_value = _create_workspace_kendra(request, config)
    return ret_value


@router.resolver(field_name="createBedrockKBWorkspace")
@tracer.capture_method
@permissions.approved_roles(
    [permissions.ADMIN_ROLE, permissions.WORKSPACES_MANAGER_ROLE]
)
def create_bedrock_kb_workspace(input: dict):
    config = genai_core.parameters.get_config()

    request = CreateWorkspaceBedrockKBRequest(**input)
    ret_value = _create_workspace_bedrock_kb(request, config)
    return ret_value


def _create_workspace_aurora(request: CreateWorkspaceAuroraRequest, config: dict):
    workspace_name = request.name.strip()
    embedding_models = config["rag"]["embeddingsModels"]
    cross_encoder_models = config["rag"]["crossEncoderModels"]

    embeddings_model = None
    cross_encoder_model = None
    for model in embedding_models:
        if (
            model["provider"] == request.embeddingsModelProvider
            and model["name"] == request.embeddingsModelName
        ):
            embeddings_model = model
            break

    for model in cross_encoder_models:
        if (
            model["provider"] == request.crossEncoderModelProvider
            and model["name"] == request.crossEncoderModelName
        ):
            cross_encoder_model = model
            break

    if embeddings_model is None:
        raise genai_core.types.CommonError("Embeddings model not found")

    if request.crossEncoderModelName is not None and cross_encoder_model is None:
        raise genai_core.types.CommonError("Cross encoder model not found")

    embeddings_model_dimensions = embeddings_model["dimensions"]

    if len(request.languages) == 0 or len(request.languages) > 3:
        raise genai_core.types.CommonError("Invalid languages")

    if request.metric not in ["inner", "cosine", "l2"]:
        raise genai_core.types.CommonError("Invalid metric")

    if request.chunkingStrategy not in [
        genai_core.types.ChunkingStrategy.RECURSIVE.value,
        genai_core.types.ChunkingStrategy.FILE_LEVEL.value,
    ]:
        raise genai_core.types.CommonError("Invalid chunking strategy")

    if request.chunkingStrategy == genai_core.types.ChunkingStrategy.RECURSIVE.value:
        if request.chunkSize < 100 or request.chunkSize > 10000:
            raise genai_core.types.CommonError("Invalid chunk size")

        if request.chunkOverlap < 0 or request.chunkOverlap >= request.chunkSize:
            raise genai_core.types.CommonError("Invalid chunk overlap")

    return _convert_workspace(
        genai_core.workspaces.create_workspace_aurora(
            workspace_name=workspace_name,
            embeddings_model_provider=request.embeddingsModelProvider,
            embeddings_model_name=request.embeddingsModelName,
            embeddings_model_dimensions=embeddings_model_dimensions,
            cross_encoder_model_provider=request.crossEncoderModelProvider,
            cross_encoder_model_name=request.crossEncoderModelName,
            languages=request.languages,
            metric=request.metric,
            has_index=request.index,
            hybrid_search=request.hybridSearch,
            chunking_strategy=request.chunkingStrategy,
            chunk_size=request.chunkSize,
            chunk_overlap=request.chunkOverlap,
        )
    )


def _create_workspace_open_search(
    request: CreateWorkspaceOpenSearchRequest, config: dict
):
    workspace_name = request.name.strip()
    embedding_models = config["rag"]["embeddingsModels"]
    cross_encoder_models = config["rag"]["crossEncoderModels"]

    embeddings_model = None
    cross_encoder_model = None
    for model in embedding_models:
        if (
            model["provider"] == request.embeddingsModelProvider
            and model["name"] == request.embeddingsModelName
        ):
            embeddings_model = model
            break

    for model in cross_encoder_models:
        if (
            model["provider"] == request.crossEncoderModelProvider
            and model["name"] == request.crossEncoderModelName
        ):
            cross_encoder_model = model
            break

    if embeddings_model is None:
        raise genai_core.types.CommonError("Embeddings model not found")

    if request.crossEncoderModelName is not None and cross_encoder_model is None:
        raise genai_core.types.CommonError("Cross encoder model not found")

    if request.chunkingStrategy not in [
        genai_core.types.ChunkingStrategy.RECURSIVE.value,
        genai_core.types.ChunkingStrategy.FILE_LEVEL.value,
    ]:
        raise genai_core.types.CommonError("Invalid chunking strategy")

    if request.chunkingStrategy == genai_core.types.ChunkingStrategy.RECURSIVE.value:
        if request.chunkSize < 100 or request.chunkSize > 10000:
            raise genai_core.types.CommonError("Invalid chunk size")

        if request.chunkOverlap < 0 or request.chunkOverlap >= request.chunkSize:
            raise genai_core.types.CommonError("Invalid chunk overlap")

    embeddings_model_dimensions = embeddings_model["dimensions"]

    if len(request.languages) == 0 or len(request.languages) > 3:
        raise genai_core.types.CommonError("Invalid languages")

    return _convert_workspace(
        genai_core.workspaces.create_workspace_open_search(
            workspace_name=workspace_name,
            embeddings_model_provider=request.embeddingsModelProvider,
            embeddings_model_name=request.embeddingsModelName,
            embeddings_model_dimensions=embeddings_model_dimensions,
            cross_encoder_model_provider=request.crossEncoderModelProvider,
            cross_encoder_model_name=request.crossEncoderModelName,
            languages=request.languages,
            hybrid_search=request.hybridSearch,
            chunking_strategy=request.chunkingStrategy,
            chunk_size=request.chunkSize,
            chunk_overlap=request.chunkOverlap,
        )
    )


def _create_workspace_kendra(request: CreateWorkspaceKendraRequest, config: dict):
    workspace_name = request.name.strip()
    kendra_indexes = genai_core.kendra.get_kendra_indexes()

    kendra_index = None
    for current in kendra_indexes:
        if current["id"] == request.kendraIndexId:
            kendra_index = current
            break

    if kendra_index is None:
        raise genai_core.types.CommonError("Kendra index not found")

    return _convert_workspace(
        genai_core.workspaces.create_workspace_kendra(
            workspace_name=workspace_name,
            kendra_index=kendra_index,
            use_all_data=request.useAllData,
        )
    )


def _create_workspace_bedrock_kb(
    request: CreateWorkspaceBedrockKBRequest, config: dict
):
    workspace_name = request.name.strip()
    kbs = genai_core.bedrock_kb.list_bedrock_kbs()

    knowledge_base = None
    for current in kbs:
        if current["id"] == request.knowledgeBaseId:
            knowledge_base = current
            break

    if knowledge_base is None:
        raise genai_core.types.CommonError("Knowledge Base id not found")

    return _convert_workspace(
        genai_core.workspaces.create_workspace_bedrock_kb(
            workspace_name=workspace_name,
            knowledge_base=knowledge_base,
            hybrid_search=request.hybridSearch,
        )
    )


def _convert_workspace(workspace: dict):
    kendra_index_external = workspace.get("kendra_index_external")

    return {
        "id": workspace["workspace_id"],
        "name": workspace["name"],
        "engine": workspace["engine"],
        "status": workspace["status"],
        "languages": workspace.get("languages"),
        "embeddingsModelProvider": workspace.get("embeddings_model_provider"),
        "embeddingsModelName": workspace.get("embeddings_model_name"),
        "embeddingsModelDimensions": workspace.get("embeddings_model_dimensions"),
        "crossEncoderModelProvider": workspace.get("cross_encoder_model_provider"),
        "crossEncoderModelName": workspace.get("cross_encoder_model_name"),
        "metric": workspace.get("metric"),
        "index": workspace.get("has_index"),
        "hybridSearch": workspace.get("hybrid_search"),
        "chunkingStrategy": workspace.get("chunking_strategy"),
        "chunkSize": workspace.get("chunk_size"),
        "chunkOverlap": workspace.get("chunk_overlap"),
        "vectors": workspace.get("vectors", 0),
        "documents": workspace.get("documents", 0),
        "aossEngine": workspace.get("aoss_engine"),
        "hasIndex": workspace.get("has_index"),
        "formatVersion": workspace.get("format_version"),
        "sizeInBytes": workspace.get("size_in_bytes"),
        "kendraIndexId": workspace.get("kendra_index_id"),
        "kendraIndexExternal": kendra_index_external,
        "kendraUseAllData": workspace.get("kendra_use_all_data", kendra_index_external),
        "knowledgeBaseId": workspace.get("knowledge_base_id"),
        "knowledgeBaseExternal": workspace.get("knowledge_base_external"),
        "createdAt": workspace.get("created_at"),
        "updatedAt": workspace.get("updated_at"),
    }
