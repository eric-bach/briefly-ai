from dataclasses import dataclass
from aws_cdk import (
    Stack,
    aws_s3 as s3,
    aws_cognito as cognito,
    aws_ec2 as ec2,
    CfnOutput,
    RemovalPolicy,
)
from constructs import Construct
from dotenv import load_dotenv

@dataclass
class DataStackResources:
    vpc: ec2.Vpc

class DataStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, app_name: str, env_name: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Load environment variables from .env file
        load_dotenv()
        
        # Get environment variables with fallbacks
        APP_NAME = app_name
        ENV_NAME = env_name

        #
        # AWS VPC
        # 

        # Create a VPC for our Fargate service
        vpc = ec2.Vpc(
            self, 
            "VPC",
            vpc_name=f"{APP_NAME}-AgentVpc-{ENV_NAME}",
            max_azs=2,
            nat_gateways=0,         # No NAT Gateway to save costs
            #cidr="172.16.0.0/16",  # Use a different CIDR block to avoid conflicts
        )

        #
        # Amazon Cognito
        #

        # Add Cognito User Pool for ALB authentication
        user_pool = cognito.UserPool(
            self,
            "AgentUserPool",
            user_pool_name=f"{APP_NAME}-users-{ENV_NAME}",
            sign_in_aliases=cognito.SignInAliases(email=True),
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            self_sign_up_enabled=True,
            user_verification=cognito.UserVerificationConfig(
                email_subject="Verify your email for Briefly AI",
                email_body="Welcome to Briefly AI! Your verification code is: {####}",
                email_style=cognito.VerificationEmailStyle.CODE,
            ),
            password_policy=cognito.PasswordPolicy(
                min_length=8,
                require_lowercase=True,
                require_uppercase=True,
                require_digits=True,
            ),
            removal_policy=RemovalPolicy.DESTROY,
        )
        
        user_pool_client = cognito.UserPoolClient(
            self,
            "UserPoolClient",
            user_pool_client_name=f"{APP_NAME}-user-client-{ENV_NAME}",
            user_pool=user_pool
        )

        user_pool_domain = cognito.UserPoolDomain(
            self,
            "UserPoolDomain",
            user_pool=user_pool,
            cognito_domain=cognito.CognitoDomainOptions(
                domain_prefix=f"{APP_NAME}"  # Must be globally unique
            ),
        )

        #
        # Outputs
        #

        CfnOutput(
            self,
            "CognitoUserPoolId",
            value=user_pool.user_pool_id,
            description=f"{APP_NAME} Cognito User Pool ID",
            export_name=f"{APP_NAME}-cognito-user-pool-id"
        )

        # Output the React App Client ID
        CfnOutput(
            self,
            "CognitoReactAppClientId",
            value=user_pool_client.user_pool_client_id,
            description=f"{APP_NAME} Cognito React App Client ID",
            export_name=f"{APP_NAME}-cognito-react-app-client-id"
        )
        
        #
        # Properties
        #

        self.resources = DataStackResources(
            vpc=vpc,
        )