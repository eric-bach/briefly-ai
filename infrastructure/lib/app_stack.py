from aws_cdk import Stack, CfnOutput
from aws_cdk.aws_bedrock_agentcore_alpha import Runtime, AgentRuntimeArtifact
from aws_cdk.aws_iam import Role, PolicyStatement, ManagedPolicy, ServicePrincipal, User
from aws_cdk.aws_ecr_assets import Platform
from constructs import Construct
from dotenv import load_dotenv
from .data_stack import DataStack

class AppStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, app_name: str, env_name: str, data_stack: DataStack, **kwargs) -> None:
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
            directory="../backend/cdk",
            platform=Platform.LINUX_ARM64
        )

        runtime = Runtime(self, "AgentRuntime",
            runtime_name=f"{APP_NAME}_agent_{ENV_NAME}".replace("-", "_"),
            execution_role=role,
            agent_runtime_artifact=agent_runtime_artifact,
        )

        # Create a dedicated IAM User for Vercel
        vercel_user = User(self, "VercelAgentInvoker",
            user_name=f"{APP_NAME}-vercel-invoker-{ENV_NAME}"
        )

        # Grant permission to invoke this specific agent alias
        vercel_user.add_to_policy(PolicyStatement(
            actions=["bedrock-agentcore:InvokeAgentRuntime"],
            resources=[runtime.agent_runtime_arn, f"{runtime.agent_runtime_arn}/*"] 
        ))

        # Grant DynamoDB access to Vercel User
        data_stack.resources.table.grant_read_write_data(vercel_user)

        CfnOutput(self, "VercelUserOutput",
            value=vercel_user.user_name,
            description="The IAM User Name for Vercel. Create Access Keys for this user in AWS Console."
        )
