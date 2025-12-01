#!/usr/bin/env python
"""Minimal inference script for Squirrel AI Core Lite."""
from __future__ import annotations

from pathlib import Path

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer


def main() -> None:
    model_path = Path("./squirrel_ai_core_lite")
    if not model_path.exists():
        raise FileNotFoundError(
            "Merged model not found. Run train_squirrel_ai_lite.py first to create ./squirrel_ai_core_lite."
        )

    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model = AutoModelForCausalLM.from_pretrained(model_path, device_map="auto")

    prompt = "Generate a GET request for /users"
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    with torch.no_grad():
        output = model.generate(**inputs, max_new_tokens=120)
    print(tokenizer.decode(output[0], skip_special_tokens=True))


if __name__ == "__main__":
    main()
