#!/usr/bin/env python
"""Train Squirrel AI Core Lite with 4-bit QLoRA."""
from __future__ import annotations

import argparse
import logging
from pathlib import Path
from typing import Dict

import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    DataCollatorForLanguageModeling,
    Trainer,
    TrainingArguments,
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

PROMPT_WITH_INPUT = """### Instruction:\n{instruction}\n\n### Input:\n{input}\n\n### Response:\n"""
PROMPT_NO_INPUT = """### Instruction:\n{instruction}\n\n### Response:\n"""


def build_prompt(example: Dict[str, str]) -> str:
    instruction = example.get("instruction", "").strip()
    input_text = example.get("input", "").strip()
    output = example.get("output", "").strip()

    prompt = (
        PROMPT_WITH_INPUT.format(instruction=instruction, input=input_text)
        if input_text
        else PROMPT_NO_INPUT.format(instruction=instruction)
    )
    return f"{prompt}{output}".strip()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train the Squirrel AI Core Lite model")
    parser.add_argument(
        "--model",
        default="microsoft/phi-3-mini-4k-instruct",
        help="Base model identifier",
    )
    parser.add_argument(
        "--dataset",
        default="squirrel_ai_lite/small_squirrel_ai.jsonl",
        help="Path to the JSONL dataset",
    )
    parser.add_argument(
        "--output-dir",
        default="squirrel_ai_core_lite",
        help="Directory where the merged model will be stored",
    )
    parser.add_argument(
        "--lora-r",
        type=int,
        default=8,
        help="LoRA rank",
    )
    parser.add_argument(
        "--lora-alpha",
        type=int,
        default=16,
        help="LoRA alpha",
    )
    parser.add_argument(
        "--lora-dropout",
        type=float,
        default=0.05,
        help="LoRA dropout",
    )
    parser.add_argument(
        "--max-length",
        type=int,
        default=1024,
        help="Maximum tokenized sequence length",
    )
    parser.add_argument(
        "--learning-rate",
        type=float,
        default=2e-4,
        help="Learning rate",
    )
    parser.add_argument(
        "--warmup-ratio",
        type=float,
        default=0.05,
        help="Warmup ratio",
    )
    parser.add_argument(
        "--use-4bit",
        action="store_true",
        help="Force 4-bit loading (default: auto-detect)",
    )
    parser.add_argument(
        "--no-4bit",
        action="store_true",
        help="Disable 4-bit loading if bitsandbytes is unavailable",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("squirrel_ai_lite")

    dataset_path = Path(args.dataset)
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset not found: {dataset_path}")

    torch.manual_seed(args.seed)

    use_4bit = args.use_4bit or (not args.no_4bit)

    bnb_config = None
    if use_4bit:
        logger.info("Loading model in 4-bit mode")
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.float16,
        )
    else:
        logger.info("Loading model in fp16 mode")

    tokenizer = AutoTokenizer.from_pretrained(args.model, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    model = AutoModelForCausalLM.from_pretrained(
        args.model,
        quantization_config=bnb_config,
        trust_remote_code=True,
        device_map="auto",
    )

    model = prepare_model_for_kbit_training(model)
    lora_config = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        target_modules=["q_proj", "v_proj"],
        lora_dropout=args.lora_dropout,
        bias="none",
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    model.config.use_cache = False
    if hasattr(model, "enable_input_require_grads"):
        model.enable_input_require_grads()

    raw_dataset = load_dataset("json", data_files=str(dataset_path))
    train_dataset = raw_dataset["train"].shuffle(seed=args.seed).map(
        lambda example: {"text": build_prompt(example)},
        remove_columns=raw_dataset["train"].column_names,
    )

    def tokenize_function(batch: Dict[str, str]) -> Dict[str, list[int]]:
        return tokenizer(
            batch["text"],
            max_length=args.max_length,
            truncation=True,
            padding=False,
        )

    tokenized_dataset = train_dataset.map(
        tokenize_function,
        batched=True,
        remove_columns=["text"],
    )

    data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    adapter_dir = output_dir / "adapter"
    adapter_dir.mkdir(parents=True, exist_ok=True)

    training_args = TrainingArguments(
        output_dir=str(output_dir / "checkpoints"),
        num_train_epochs=1,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=4,
        learning_rate=args.learning_rate,
        warmup_ratio=args.warmup_ratio,
        logging_steps=5,
        save_strategy="no",
        report_to=[],
        bf16=torch.cuda.is_available() and torch.cuda.is_bf16_supported(),
        fp16=torch.cuda.is_available() and not torch.cuda.is_bf16_supported(),
        gradient_checkpointing=True,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset,
        data_collator=data_collator,
    )

    trainer.train()

    logger.info("Saving LoRA adapter to %s", adapter_dir)
    trainer.model.save_pretrained(adapter_dir)

    logger.info("Merging LoRA weights into base model")
    merged_model = trainer.model.merge_and_unload()

    logger.info("Saving merged model to %s", output_dir)
    merged_model.save_pretrained(output_dir, safe_serialization=True)
    tokenizer.save_pretrained(output_dir)

    logger.info("Training complete")


if __name__ == "__main__":
    main()
