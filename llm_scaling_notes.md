# LLM Scaling & Tensor Parallelism Notes

## vLLM and the Forward Pass

Every time a model generates a single token, it runs the entire neural network once — that's a "forward pass." For a 4B parameter model that means billions of floating point multiplications happening in parallel on the GPU. It's why GPUs are ideal — they're designed for exactly this kind of massively parallel math.

The naive approach runs one forward pass per user request, serially. vLLM's insight is: **a forward pass for 10 users at once isn't 10x more expensive than one user** — the math batches efficiently across the same GPU cores. That's continuous batching. You're amortizing the fixed overhead across many users simultaneously.

---

## Topology for 100+ Concurrent Users

```
                    [ Load Balancer ]
                          |
              +-----------+-----------+
              |           |           |
        [ Inference  [ Inference  [ Inference
          Node 1 ]    Node 2 ]    Node 3 ]
         4x H100      4x H100      4x H100
         80GB ea.     80GB ea.     80GB ea.
              |           |           |
              +-----------+-----------+
                          |
                  [ Redis / Queue ]
                  (request routing,
                   session affinity)
```

Each inference node runs vLLM with tensor parallelism — the model is split across the 4 GPUs, not copied 4 times. This lets you run a 70B or 405B parameter model that wouldn't fit on a single card.

### Stack breakdown

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Load balancer | nginx / Caddy | Route HTTP requests |
| Inference server | vLLM | Batching, scheduling |
| Model | Gemma 27B or Llama 3 70B | Quality at scale |
| GPU interconnect | NVLink | Tensor parallelism |
| Queue | Redis | Request buffering, session affinity |
| Monitoring | Grafana + DCGM | GPU utilization, latency |

### Rough cost
- 3 nodes × 4× H100 = ~$900K hardware
- Or ~$15–30K/month on AWS p4 instances

A single H100 (~$30K) running vLLM handles ~100 concurrent users comfortably for most chatbot workloads.

---

## How Tensor Parallelism Actually Works (405B Example)

A 405B model has 126 layers, each a giant matrix multiplication too large for one GPU. The matrices are split across GPUs:

```
Token input
     |
[ Layer 1 - split across 8 GPUs ]
  GPU1: rows 0-10k    GPU2: rows 10-20k ... GPU8: rows 70-80k
     |                     |                      |
     +---------------------+---------- ... -------+
                           |
                    [ all-reduce ]  ← GPUs sum partial results via NVLink
                           |
[ Layer 2 - split across 8 GPUs ]
                           |
                    [ all-reduce ]
                           |
                          ...
                    (126 layers later)
                           |
                    [ output token ]
```

The weight matrix slices are assigned to GPUs at model load time by vLLM. There's no runtime lookup — every GPU always processes every token, just a different slice of each layer.

The **all-reduce step** is the key cost — after each layer, GPUs must synchronize and sum their partial results. That's why NVLink bandwidth (~900 GB/s) is critical. PCIe (~32 GB/s) is too slow for tensor parallelism to be worthwhile.

---

## Hashmap vs Tensor Parallelism

| Hashmap | Tensor Parallelism |
|---------|-------------------|
| Each node owns a partition | All nodes share every request |
| Nodes are independent | Nodes are tightly coupled |
| One node answers | All nodes answer together |
| Network latency is fine | Network latency kills you |

Tensor parallelism is closer to **a distributed matrix multiplication than a distributed database.**

---

## Key Scaling Constraints

- **More VRAM** → bigger models or longer context windows
- **More GPUs** → more throughput
- **Better inference server (vLLM)** → squeeze more out of what you have
- VRAM capacity and compute throughput are separate constraints — 4 model copies on one GPU still queue serially on the same CUDA cores
