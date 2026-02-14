import os
import sys
import json
import logging
import re
from dotenv import load_dotenv

# Add parent directory to path to allow importing from tools and prompts
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from strands import Agent
from strands.models import BedrockModel
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from tools.youtube import get_video_transcript
from prompts.prompt import SYSTEM_PROMPT

load_dotenv()

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Monkey patch BedrockAgentCoreApp to avoid "data: " prefix and quotes for strings
def _raw_convert_to_sse(self, obj) -> bytes:
    if isinstance(obj, str):
        # Return raw bytes for strings
        return obj.encode("utf-8")
    
    # Fallback for other types
    try:    
        json_string = json.dumps(obj, ensure_ascii=False)
        sse_data = f"data: {json_string}\n\n"
        return sse_data.encode("utf-8")
    except:
        return str(obj).encode("utf-8")

BedrockAgentCoreApp._convert_to_sse = _raw_convert_to_sse

app = BedrockAgentCoreApp()

@app.entrypoint
async def invoke(payload):
    logger.info(f"▶️ Received payload: {json.dumps(payload)}")

    video_url = payload.get('videoUrl', '')
    additional_instructions = payload.get('additionalInstructions', '')
    
    if not video_url:
        yield "🛑 Error: Missing video_url parameter"

    try:
        agent = Agent(
            name="youtube_summarizer",
            model=BedrockModel(
                model_id='us.amazon.nova-2-lite-v1:0'
            ),
            system_prompt=SYSTEM_PROMPT,
            tools=[get_video_transcript]
        )    
        
        user_prompt = f"Summarize this YouTube video: {video_url}"
        if additional_instructions:
            user_prompt += f"\n\nAdditional User Instructions:\n{additional_instructions}"

        async for event in agent.stream_async(user_prompt):
            if "data" in event:
                yield event["data"]

        logger.info("✅ Agent completed")
    except Exception as e:
        error_response = {"error": str(e), "type": "stream_error"}
        logger.error(f"🛑 Streaming error: {error_response}", exc_info=True)
        yield error_response
    
if __name__ == "__main__":
    logger.info("⚙️ Briefly AI agent started")
    app.run()
