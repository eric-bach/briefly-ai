- test-gemini.py

  - SUCCESS: works with native Google API

- test-strands.py

  - SUCCESS: works with Strands API

- test-tool-error.py

  - FAILED: does not work with Strands API with tools as Strands needs to update to support the new API in Google for Gemini 3+
  - https://ai.google.dev/gemini-api/docs/thought-signatures
  - https://github.com/strands-agents/sdk-python/pull/1227
