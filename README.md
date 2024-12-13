# CodeBuddy

![logo|100](https://github.com/Koweez/AdvancedNLP/blob/main/logo.png)

This repository contains our project for the Advanced NLP course at EPITA.

**CodeBuddy** is a VSCode extension which uses local LLMs and a pretty interface to empowers developers with AI-driven code assistance. The default model is **Qwen2.5-Coder-3B-Instruct** for the chat mode, and **Qwen2.5-Coder-3B** as a target model and **Qwen2.5-Coder-0.5B** as a draft model in speculative decoding, for the FIM (fill in the middle) task (autocompletion).

## Code layout

- **docker-compose.yml**: containers to run the extension, server and models.
- **/exploration**:
  - embeddings exploration notebooks (1 and 2).
  - fine-tuning notebook.
  - benchmark (HumanEval) notebook.
- **/extension**: VS Code extension.
- **/server**:
  - *server.py*: handle extension requests.
  - *prompts.py*: define the different prompts context.
  - *utils.py*: everything related to speculative decoding.

## Implementation

- **Exploration**:
  - benchmark: using the `human_eval` library, we ran a benchmark to choose the best small coding LLM.
  - speculative-decoding-benchmark: compute the inference time difference between the speculative and regular decoding, keeping the same accuracy.
  - fine-tuning: we tried to finetune **Llama3.2-3b** with **TheVault** dataset.
  - embedding-exploration1/2: we did experimental research on the embeddings of the **Qwen2.5-Coder-3B**, by comparing them to the embeddings of **Qwen2.5-3B** or by representing them using dimension reduction technique like t-SNE, mostly on code keywords.
- **Extension**:
  - one command to open a panel on the right side, in which we can chat with **Qwen2.5-Coder-3B**. We can choose files for context, have a conversation history and cancel requests.
  - FIM code completion.
- **Backend: FastAPI**
  - /prompt: endpoint to handle chat request with (or without) files in context. If there are context files, this is where the prompt is enhanced to take them into account.
  - /autocomplete: endpoint to handle autocomplete request by using speculative decoding. Everything related to speculative decoding is in the `utils.py` file.
- **Models:**
  - Chat-mode: **Qwen2.5-Coder-3B-Instruct** model runs on `Ollama`.
  - FIM (speculative decoding): **Qwen2.5-Coder-3B** and **Qwen2.5-Coder-0.5B** models run using the `transformers` library.

## How to use ?

```
~$ docker compose up
~$ firefox localhost:8080
```
