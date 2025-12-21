import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
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
