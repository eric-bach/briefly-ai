import os
import json
from dotenv import load_dotenv
from strands import Agent, tool
from strands.models.gemini import GeminiModel

load_dotenv()

@tool
def get_current_time() -> str:
    """Returns the current time."""
    return "It is currently 12:00 PM"

def app():
    model = GeminiModel(
        client_args={
            "api_key": os.environ.get("GEMINI_API_KEY"),
        },
        model_id="gemini-3-flash-preview"
    )

    agent = Agent(
        model=model,
        system_prompt="You are a helpful assistant.",
        tools=[get_current_time]
    )

    agent("What time is it?")

if __name__ == "__main__":
    app()
