OpenAI helper

This folder contains a tiny helper to call the OpenAI Chat Completion API with a configurable default model.

Usage

- Set your API key:
  export OPENAI_API_KEY="sk-..."  (Windows PowerShell: $env:OPENAI_API_KEY = 'sk-...')
- Optionally set the model you want to use globally:
  export OPENAI_MODEL="gpt-5-mini"
- Start the example server:
  node example.js

Then POST to http://localhost:4004/openai-test with JSON { "messages": [ { "role":"user", "content":"Hola" } ] }
