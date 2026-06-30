# Load Test Report

## Methodology

| Parameter      | Value                  |
|----------------|------------------------|
| Protocol       | RSocket                |
| Target         | localhost:7000         |
| Concurrency    | 4096                   |
| Connections    | 8                      |
| VT/connection  | 512                    |
| Warmup         | convergence-based      |
| Measurement    | 10 s                   |
| Timestamp      | 20260630-082345        |
| JVM            | 25.0.4                 |
| OS             | Linux amd64            |
| CPUs           | 16                     |
| Label          | hospital-300_jvm_8p_50pct |

## Results

| Method                   | Threads |   Mean (ops/s) |         95% CI | Median (ops/s) |     StdDev |   CV% |            Min |            Max |             p5 |            p95 |
| ------------------------ | ------: | -------------: | -------------: | -------------: | ---------: | ----: | -------------: | -------------: | -------------: | -------------: |
| rsocket-8c-512w-1003728r |       1 |         900388 |              0 |         900388 |          0 |  0.0% |         900388 |         900388 |         900388 |         900388 |

## Latency (measured per-request)

| Method                   | Threads |     p50 (ns) |     p90 (ns) |     p99 (ns) |   p99.9 (ns) |     max (ns) |
| ------------------------ | ------: | -----------: | -----------: | -----------: | -----------: | -----------: |
| rsocket-8c-512w-1003728r |       1 |       249088 |      1028098 |      5630119 |     17556159 |     42897916 |

## Latency (derived from throughput via Little's Law)

| Method                   | Threads |   Mean (ns/op) |     p5 (ns/op) |    p95 (ns/op) |
| ------------------------ | ------: | -------------: | -------------: | -------------: |
| rsocket-8c-512w-1003728r |       1 |           1111 |           1111 |           1111 |

