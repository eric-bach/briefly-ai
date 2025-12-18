import os
import json
import sys
from dotenv import load_dotenv
from strands import Agent
from strands.models.gemini import GeminiModel
from bedrock_agentcore.runtime import BedrockAgentCoreApp

load_dotenv()

# Ensure backend root is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

app = BedrockAgentCoreApp()

@app.entrypoint
async def app(payload):
    print(f"Received payload: {json.dumps(payload)}")

    model = GeminiModel(
        client_args={
            "api_key": os.environ.get("GEMINI_API_KEY"),
        },
        model_id=os.environ.get("MODEL_ID")
    )

    try:
        agent = Agent(
            model=model,
            system_prompt="You are a helpful assistant.",
        )

        async for event in agent.stream_async("Tell me about AI in a few words."):
            if "data" in event:
                yield event["data"]    

        print("\nAgent completed")
    except Exception as e:
        print(f"Error creating agent: {e}")
        return

if __name__ == "__main__":
    app.run()
