import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export const docClient = DynamoDBDocumentClient.from(client);

export const TABLE_NAME =
  process.env.PROMPT_OVERRIDES_TABLE_NAME || "briefly-ai-data-dev";

export interface PromptOverride {
  userId: string;
  targetId: string;
  prompt: string;
  type: "video" | "channel";
  updatedAt: string;
  targetTitle?: string;
  targetThumbnail?: string;
  channelTitle?: string;
}

export interface UserProfile {
  userId: string;
  targetId: "profile"; // Fixed sort key for profile data
  notificationEmail?: string;
  emailNotificationsEnabled: boolean;
  updatedAt: string;
}

export interface PaginatedPromptOverrides {
  items: PromptOverride[];
  nextToken: string | null;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      userId,
      targetId: "profile",
    },
  });

  const response = await docClient.send(command);
  return (response.Item as UserProfile) || null;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      ...profile,
      targetId: "profile", // Ensure targetId is always "profile"
    },
  });

  await docClient.send(command);
}

export async function getPromptOverride(
  userId: string,
  targetId: string
): Promise<PromptOverride | null> {
  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      userId,
      targetId,
    },
  });

  const response = await docClient.send(command);
  return (response.Item as PromptOverride) || null;
}

export async function savePromptOverride(
  override: PromptOverride
): Promise<void> {
  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: override,
  });

  await docClient.send(command);
}

export async function deletePromptOverride(
  userId: string,
  targetId: string
): Promise<void> {
  const command = new DeleteCommand({
    TableName: TABLE_NAME,
    Key: {
      userId,
      targetId,
    },
  });

  await docClient.send(command);
}

export async function listPromptOverrides(
  userId: string,
  limit: number = 20,
  nextToken?: string,
  filter?: string
): Promise<PaginatedPromptOverrides> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "userId = :uid",
    ExpressionAttributeValues: {
      ":uid": userId,
    },
    Limit: limit,
  };

  if (nextToken) {
    try {
        params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf-8'));
    } catch (e) {
        console.error("Invalid nextToken", e);
    }
  }

  if (filter) {
      params.FilterExpression = "contains(prompt, :f)";
      params.ExpressionAttributeValues[":f"] = filter;
  }

  const command = new QueryCommand(params);
  const response = await docClient.send(command);

  let newNextToken: string | null = null;
  if (response.LastEvaluatedKey) {
      newNextToken = Buffer.from(JSON.stringify(response.LastEvaluatedKey)).toString('base64');
  }

  return {
    items: (response.Items as PromptOverride[]) || [],
    nextToken: newNextToken,
  };
}