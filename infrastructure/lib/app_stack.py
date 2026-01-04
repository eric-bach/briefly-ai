import os
from aws_cdk.aws_bedrock_agentcore_alpha import Runtime, AgentRuntimeArtifact
from aws_cdk.aws_iam import Role, PolicyDocument, PolicyStatement, ManagedPolicy, ServicePrincipal, User
from aws_cdk import (
    Stack, 
    CfnOutput,
    aws_lambda as _lambda,
    aws_events as events,
    aws_events_targets as targets,
    Duration
)
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

        #
        # Amazon Bedrock AgentCore
        #

        role = Role(self, "AgentRole",
            assumed_by=ServicePrincipal("bedrock-agentcore.amazonaws.com"),
            managed_policies=[
                ManagedPolicy.from_aws_managed_policy_name("CloudWatchFullAccess"),
            ]
        )

        role.add_to_policy(PolicyStatement(
            actions=["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
            resources=["*"]
        ))

        agent_runtime_artifact = AgentRuntimeArtifact.from_asset(
            directory="../backend/cdk",
            platform=Platform.LINUX_ARM64
        )

        runtime = Runtime(self, "AgentRuntime",
            runtime_name=f"{APP_NAME}_agent_{ENV_NAME}".replace("-", "_"),
            execution_role=role,
            agent_runtime_artifact=agent_runtime_artifact,
        )

        #
        # AWS Lambda
        #
        
        poller_fn = _lambda.Function(self, "ChannelPoller",
            function_name=f"{APP_NAME}-channel-poller-{ENV_NAME}",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="main.handler",
            code=_lambda.Code.from_asset("../backend/lambdas/channel_poller"),
            timeout=Duration.seconds(300), # 5 minutes
            environment={
                "TABLE_NAME": data_stack.resources.table.table_name,
                "SES_SOURCE_EMAIL": os.environ.get("SES_SOURCE_EMAIL"),
                "AGENT_RUNTIME_ARN": runtime.agent_runtime_arn,
                "POWERTOOLS_SERVICE_NAME": "ChannelPoller",
                "LOG_LEVEL": "INFO"
            },
            layers=[
                _lambda.LayerVersion.from_layer_version_arn(self, "PowertoolsLayer", 
                    "arn:aws:lambda:us-east-1:017000801446:layer:AWSLambdaPowertoolsPythonV2:60"
                )
            ]
        )
        
        # Grant permissions to Poller
        data_stack.resources.table.grant_read_write_data(poller_fn)
        
        poller_fn.add_to_role_policy(PolicyStatement(
            actions=["bedrock-agentcore:InvokeAgentRuntime"],
            resources=[runtime.agent_runtime_arn, f"{runtime.agent_runtime_arn}/*"]
        ))
        
        poller_fn.add_to_role_policy(PolicyStatement(
            actions=["ses:SendEmail"],
            resources=["*"]
        ))
        
        #
        # Amazon EventBridge 
        #

        rule = events.Rule(self, "ChannelPollerRule",
            schedule=events.Schedule.rate(Duration.minutes(15))
        )
        rule.add_target(targets.LambdaFunction(poller_fn))

        #
        # Vercel IAM User
        #

        # Create a dedicated IAM User for Vercel
        vercel_user = User(self, "VercelAgentInvoker",
            user_name=f"{APP_NAME}-vercel-invoker-{ENV_NAME}"
        )

        vercel_user.add_to_policy(PolicyStatement(
            actions=["bedrock-agentcore:InvokeAgentRuntime"],
            resources=[runtime.agent_runtime_arn, f"{runtime.agent_runtime_arn}/*"] 
        ))

        vercel_user.add_to_policy(PolicyStatement(
            actions=["ses:SendEmail"],
            resources=["*"]
        ))

        data_stack.resources.table.grant_read_write_data(vercel_user)

        #
        # Outputs
        #

        CfnOutput(self, "VercelUserOutput",
            value=vercel_user.user_name,
            description="The IAM User Name for Vercel. Create Access Keys for this user in AWS Console."
        )
