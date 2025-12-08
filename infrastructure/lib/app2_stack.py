from aws_cdk import (
    Stack,
    aws_iam as iam,
)
from aws_cdk import aws_bedrock_agentcore_alpha as agentcore
from aws_cdk.aws_ecr_assets import Platform
from constructs import Construct
from dotenv import load_dotenv

class App2Stack(Stack):
    def __init__(self, scope: Construct, construct_id: str, app_name: str, env_name: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Load environment variables from .env file
        load_dotenv()
        
        # Get environment variables with fallbacks
        APP_NAME = app_name
        ENV_NAME = env_name

        role = iam.Role(self, "AgentRole",
            assumed_by=iam.ServicePrincipal("bedrock-agentcore.amazonaws.com")
        )

        role.add_to_policy(iam.PolicyStatement(
            actions=["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
            resources=["*"]
        ))

        role.add_managed_policy(
            iam.ManagedPolicy.from_aws_managed_policy_name("CloudWatchFullAccess")
        )

        agent_runtime_artifact = agentcore.AgentRuntimeArtifact.from_asset(
            directory="../backend-cdk/agent_deployment",
            platform=Platform.LINUX_ARM64
        )

        runtime = agentcore.Runtime(self, "MyAgentRuntime",
            runtime_name="myAgent",
            execution_role=role,
            agent_runtime_artifact=agent_runtime_artifact,
        )