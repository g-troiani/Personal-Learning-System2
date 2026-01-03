# LLM Models Comparison (January 2026)

This document compares LLM models for the Personal Learning System, focusing on document ingestion, content generation, and cost optimization.

---

## Quick Reference: Best Value Models

| Use Case | Recommended Model | Input $/M | Output $/M | Why |
|----------|------------------|-----------|------------|-----|
| **High-Volume Ingestion** | Gemini 2.0 Flash-Lite | $0.075 | $0.30 | Cheapest quality option |
| **Long Documents** | Llama 4 Scout (Groq) | $0.11 | $0.34 | 10M token context |
| **Complex Extraction** | Claude Sonnet 4.5 | $3.00 | $15.00 | Best comprehension |
| **Content Generation** | GPT-4o mini | $0.15 | $0.60 | Strong creative output |
| **Math Content** | Kimi K2 | $1.00 | $3.00 | 97.4% MATH-500 |
| **Absolute Budget** | DeepSeek V3 (cached) | $0.028 | $0.42 | 90% cache savings |

---

## Master Pricing Table (Per Million Tokens)

### Tier 1: Ultra-Budget ($0.05-$0.15 input)

| Model | Provider | Input | Output | Context | Speed | Best For |
|-------|----------|-------|--------|---------|-------|----------|
| Llama 3.1 8B | Groq | $0.05 | $0.08 | 128K | 840 TPS | Quick classification |
| DeepSeek V3 (cached) | DeepSeek | $0.028 | $0.42 | 128K | - | High-volume batch |
| Gemini 2.0 Flash-Lite | Google | $0.075 | $0.30 | 1M | Fast | Document processing |
| GPT OSS 20B | Groq | $0.075 | $0.30 | 128K | 1000 TPS | Tool use workflows |
| Gemini 2.0 Flash | Google | $0.10 | $0.40 | 1M-2M | 169 TPS | Balanced quality |
| Llama 4 Scout | Groq | $0.11 | $0.34 | **10M** | 594 TPS | Entire books |
| GPT-4o mini | OpenAI | $0.15 | $0.60 | 128K | - | Content generation |
| GPT OSS 120B | Groq | $0.15 | $0.60 | 128K | 500 TPS | Reasoning tasks |

### Tier 2: Mid-Range ($0.20-$1.00 input)

| Model | Provider | Input | Output | Context | Speed | Best For |
|-------|----------|-------|--------|---------|-------|----------|
| Llama 4 Maverick | Groq | $0.20 | $0.60 | 1M | 562 TPS | Multimodal docs |
| DeepSeek V3 | DeepSeek | $0.28 | $0.42 | 128K | - | General purpose |
| Qwen3 32B | Groq | $0.29 | $0.59 | 131K | 662 TPS | Multilingual |
| Gemini 2.5 Flash | Google | $0.30 | $2.50 | 1M | Fast | Quality balance |
| Gemini 3 Flash | Google | $0.50 | $3.00 | 1M | 3x faster | Latest Google |
| Llama 3.3 70B | Groq | $0.59 | $0.79 | 128K | 394 TPS | Instruction following |
| Claude Haiku 4.5 | Anthropic | $1.00 | $5.00 | 200K | 4-5x Sonnet | Fast extraction |
| Kimi K2 | Groq | $1.00 | $3.00 | 256K | 200 TPS | Math/reasoning |

### Tier 3: Premium ($1.25+ input)

| Model | Provider | Input | Output | Context | Speed | Best For |
|-------|----------|-------|--------|---------|-------|----------|
| Gemini 2.5 Pro | Google | $1.25-2.50 | $10-15 | 1M | Medium | Complex analysis |
| Gemini 3 Pro | Google | $2.00 | $12.00 | 1M | Fast | Highest quality |
| GPT-4o | OpenAI | $2.50-5 | $10-15 | 128K | 55-109 TPS | Flagship |
| o3 | OpenAI | $2.00 | $8.00 | - | - | Reasoning |
| Claude Sonnet 4.5 | Anthropic | $3.00 | $15.00 | 200K-1M | Fast | Best extraction |
| Claude Opus 4.5 | Anthropic | $5.00 | $25.00 | 200K | Medium | Critical tasks |
| o1 | OpenAI | $15.00 | $60.00 | 200K | - | Math olympiad |
| o1-pro | OpenAI | $150.00 | $600.00 | 200K | - | Maximum quality |

---

## Benchmark Comparison

### MMLU Scores (General Knowledge)

| Model | MMLU | Notes |
|-------|------|-------|
| Gemini 3 Pro | 91.8% | Industry leader |
| Claude Opus 4.5 | 90.8% | Top tier |
| GPT OSS 120B | 90.0% | Excellent value |
| Gemini 2.5 Pro | 89.5% | Strong |
| Kimi K2 | 89.5% | Open-source leader |
| GPT-4o | 88.7% | Reliable |
| GPT OSS 20B | 85.3% | Surprising quality |
| GPT-4o mini | 82.0% | Good for price |

### Coding (HumanEval)

| Model | Score | Notes |
|-------|-------|-------|
| Claude Opus 4.5 | ~95% | Nearly saturated |
| GPT-4o | 90.2% | Excellent |
| Llama 3.3 70B | 88.4% | Best open-source |
| GPT-4o mini | 87.2% | Great value |
| Kimi K2 | 73-78% | Strong |
| GPT OSS 20B | 73% | Beats 120B |

### Math (MATH-500)

| Model | Score | Notes |
|-------|-------|-------|
| Kimi K2 | 97.4% | Best for math content |
| Llama 4 Behemoth | 95.0% | (Training) |
| o1 | 74.4% | Reasoning model |
| GPT-4o | 9.3% | Needs reasoning model |

---

## Context Window Comparison

| Context Size | Models |
|--------------|--------|
| **10M tokens** | Llama 4 Scout |
| **2M tokens** | Gemini 1.5 Pro, Gemini 2.0 Flash |
| **1M tokens** | Llama 4 Maverick, Gemini 2.5/3, Claude Sonnet (beta) |
| **256K tokens** | Kimi K2 |
| **200K tokens** | Claude models, o1/o1-pro |
| **128K tokens** | GPT-4o, Llama 3.x, Qwen3, DeepSeek |

---

## Cost Optimization Strategies

### 1. Batch API Discounts (50%)

| Provider | Batch Input | Batch Output |
|----------|-------------|--------------|
| Anthropic | 50% off | 50% off |
| OpenAI | 50% off | 50% off |
| Google | 50% off | 50% off |

### 2. Prompt Caching

| Provider | Cache Write | Cache Read | Notes |
|----------|-------------|------------|-------|
| DeepSeek | - | **90% off** | Best caching |
| Anthropic | 1.25x-2x | **90% off** | 5min-1hr TTL |
| OpenAI | - | 50% off | Context caching |

### 3. Provider Comparison (Same Model)

| Model | Provider | Price (In/Out) | Speed |
|-------|----------|----------------|-------|
| Llama 4 Maverick | Groq | $0.50/$0.77 | 307 TPS (fastest) |
| Llama 4 Maverick | Together/Fireworks | $0.27/$0.85 | 63-84 TPS |

---

## Recommendations for Personal Learning System

### Primary Stack (Recommended)

```
Document Ingestion:
├── Default: Gemini 2.0 Flash ($0.10/$0.40)
│   └── 1M+ context handles any document
│   └── Use batch API for 50% off
│
├── Long Documents: Llama 4 Scout via Groq ($0.11/$0.34)
│   └── 10M token context for entire books
│
└── Complex Extraction: Claude Sonnet 4.5 ($3.00/$15.00)
    └── Best comprehension for dense academic content
    └── Use only when Gemini struggles

Content Generation:
└── GPT-4o mini ($0.15/$0.60)
    └── Strong creative output
    └── Use batch API for 50% off

Math Content:
└── Kimi K2 ($1.00/$3.00)
    └── 97.4% MATH-500 score
    └── Reserve for generating math problems
```

### Cost Projections

| Documents/Month | Budget Stack | Hybrid Stack | Premium Stack |
|-----------------|--------------|--------------|---------------|
| 10 | $0.03 | $0.13 | $0.90 |
| 100 | $0.31 | $1.33 | $9.00 |
| 1,000 | $3.13 | $13.32 | $90.00 |

*Assumes 15K tokens input + 7K tokens output per document*

---

## API Provider Summary

| Provider | Strengths | Best For |
|----------|-----------|----------|
| **Groq** | Fastest inference (LPU), lowest latency | Llama 4, Qwen3 |
| **OpenAI** | Reliable, strong ecosystem | GPT-4o, GPT-4o mini |
| **Anthropic** | Best extraction quality | Complex documents |
| **Google** | Cheap, large context | High-volume processing |
| **DeepSeek** | Cheapest with caching | Budget operations |
| **Together AI** | 200+ models, fine-tuning | Flexibility |

---

## Self-Hosting Considerations

### When to Self-Host

| Factor | API Better | Self-Host Better |
|--------|-----------|------------------|
| Volume | < 2M tokens/day | > 2M tokens/day |
| Compliance | Standard | HIPAA, air-gapped |
| Latency | Acceptable | Sub-10ms required |

### Hardware Requirements

| Setup | Cost | Can Run |
|-------|------|---------|
| RTX 4090 (24GB) | $1,200-1,500 | 8-32B models |
| RTX 5090 (32GB) | $2,000-3,800 | Quantized 70B |
| M4 Pro 64GB | ~$3,500 | 32B at 11-12 tok/s |
| Single A100 80GB | $2,200-3,600/mo | 70B models |

### Breakeven Analysis

Self-hosting pays off at **2+ million tokens/day** with 6-12 month payback period.

---

## Key Takeaways

1. **Gemini 2.0 Flash** offers the best price/context ratio for document processing
2. **GPT-4o mini** is the sweet spot for content generation ($0.15/$0.60)
3. **Llama 4 Scout's 10M context** is unmatched for processing entire books
4. **DeepSeek V3 caching** provides 90% savings for repetitive workflows
5. **Claude Sonnet 4.5** remains the quality leader for complex extraction
6. **Kimi K2** dominates math content generation (97.4% MATH-500)
7. **Batch APIs** cut costs in half across all major providers
8. **Groq** is 3-5x faster than alternatives for Llama models

---

## Decision Framework

```
START
│
├── Is document > 128K tokens?
│   ├── YES: Use Llama 4 Scout (10M context) or Gemini Flash (1M+)
│   └── NO: Continue
│
├── Is it complex academic content?
│   ├── YES: Use Claude Sonnet 4.5
│   └── NO: Use Gemini 2.0 Flash
│
├── Is it math/STEM content generation?
│   ├── YES: Use Kimi K2
│   └── NO: Use GPT-4o mini
│
└── Is real-time response needed?
    ├── YES: Use standard pricing
    └── NO: Use batch API (50% off)
```

---

*Last updated: January 2026*
*Sources: Groq, OpenAI, Anthropic, Google AI, DeepSeek, Together AI, Artificial Analysis*
