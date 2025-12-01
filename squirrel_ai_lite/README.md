# Squirrel AI Core Lite

This folder contains the resources necessary to fine-tune and run the **Squirrel AI Core Lite** model, a compact assistant designed for the Squirrel API Studio CLI. The workflow targets GPUs with **< 4 GB of VRAM** or CPU-only environments by combining 4-bit QLoRA training with lightweight inference artifacts.

## Contents

| File | Description |
| --- | --- |
| `small_squirrel_ai.jsonl` | Small instruction-tuning dataset with API focused tasks. |
| `train_squirrel_ai_lite.py` | QLoRA training script that produces the merged model in `./squirrel_ai_core_lite`. |
| `infer_lite.py` | Minimal inference example for local verification. |
| `Modelfile` | Ollama/llama.cpp configuration for serving the merged weights. |

## Quickstart

### 1. Environment setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt  # create as needed, see packages below
```

Required Python packages:

```bash
pip install "transformers>=4.41" "datasets>=2.19" bitsandbytes peft accelerate
```

> **Tip:** On CPU-only systems you can disable bitsandbytes by adding `--no-4bit` when running the training script. This loads the base model in fp16 (or fp32 if necessary) at the cost of higher memory.

### 2. Train the LoRA adapter and merge

```bash
python squirrel_ai_lite/train_squirrel_ai_lite.py \
  --dataset squirrel_ai_lite/small_squirrel_ai.jsonl \
  --output-dir squirrel_ai_core_lite
```

* Configuration: phi-3-mini-4k-instruct base, LoRA rank 8, alpha 16, dropout 0.05
* Training schedule: 1 epoch, batch size 1, gradient accumulation 4, LR 2e-4, warmup ratio 0.05
* 4-bit NF4 quantization keeps VRAM usage under 4 GB during fine-tuning.

The script writes two artifacts:

1. `squirrel_ai_core_lite/adapter/` – standalone LoRA weights (for rapid experimentation)
2. `squirrel_ai_core_lite/` – merged base + LoRA weights suitable for direct inference

### 3. Run a local smoke test

```bash
python squirrel_ai_lite/infer_lite.py
```

Expected output: an instruction-aligned completion that includes an HTTP GET request.

### 4. Export to GGUF for Ollama or llama.cpp

After training, convert the merged model to GGUF (example using `python -m llama_cpp.convert`):

```bash
python -m llama_cpp.convert \
  --model-dir squirrel_ai_core_lite \
  --output squirrel_ai_core_lite.gguf \
  --dtype q4_0
```

Then create the Ollama model:

```bash
ollama create squirrel-ai-lite -f squirrel_ai_lite/Modelfile
ollama run squirrel-ai-lite
```

### Resource tips

* Close other GPU workloads; 4-bit QLoRA fits on 4 GB cards such as RTX 3050 Mobile.
* Use `--gradient-checkpointing` (enabled by default) to reduce activation memory.
* On CPU hosts, use `--no-4bit` and export to GGUF for efficient inference with llama.cpp.
* For larger datasets, stream from disk with `datasets` rather than loading into memory.

## Dataset expansion

`small_squirrel_ai.jsonl` ships with nine seed examples. Extend it with organization-specific tasks (request templates, error catalogs, schema walkthroughs) to improve alignment. Keep each record self-contained and concise to remain within the 1024 token limit used during training.
