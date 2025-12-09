from aws_cdk import Stack
from aws_cdk.aws_bedrock_agentcore_alpha import Runtime, AgentRuntimeArtifact
from aws_cdk.aws_iam import Role, PolicyStatement, ManagedPolicy, ServicePrincipal
from aws_cdk.aws_ecr_assets import Platform
from constructs import Construct
from dotenv import load_dotenv

class AppStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, app_name: str, env_name: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        load_dotenv()
        APP_NAME = app_name
        ENV_NAME = env_name

        role = Role(self, "AgentRole",
            assumed_by=ServicePrincipal("bedrock-agentcore.amazonaws.com")
        )

        role.add_to_policy(PolicyStatement(
            actions=["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
            resources=["*"]
        ))

        role.add_managed_policy(
            ManagedPolicy.from_aws_managed_policy_name("CloudWatchFullAccess")
        )

        agent_runtime_artifact = AgentRuntimeArtifact.from_asset(
            directory="../backend-cdk/agent_deployment",
            platform=Platform.LINUX_ARM64
        )

        runtime = Runtime(self, "AgentRuntime",
            runtime_name=f"{APP_NAME}_agent_{ENV_NAME}".replace("-", "_"),
            execution_role=role,
            agent_runtime_artifact=agent_runtime_artifact,
        )