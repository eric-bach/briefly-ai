import os
import sys
import asyncio

# Ensure backend root is in pythonpath
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agent.agents.summarizer import summarizer_agent

async def main():
    print("🎥 YouTube Summarizer Agent (CLI) 🎥")
    print("Paste a YouTube URL to get a summary. Type 'exit' to quit.\n")

    while True:
        user_input = input("Enter a YouTube URL: ")
        if user_input.lower() in ["exit", "quit", "q"]:
            break
        
        try:
            # Use stream_async for Strands agents with 'prompt' parameter
            print("\nAgent: ", end="", flush=True)
            async for event in summarizer_agent.stream_async(prompt=user_input):
                if hasattr(event, 'delta') and event.delta:
                    print(event.delta, end="", flush=True)
            print("\n")
        except Exception as e:
            print(f"\nError: {e}\n")

if __name__ == "__main__":
    asyncio.run(main())
