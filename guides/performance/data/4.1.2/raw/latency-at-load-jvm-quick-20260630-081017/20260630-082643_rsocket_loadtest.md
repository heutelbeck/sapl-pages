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
| Timestamp      | 20260630-082643        |
| JVM            | 25.0.4                 |
| OS             | Linux amd64            |
| CPUs           | 16                     |
| Label          | github-10_jvm_8p_90pct |

## Results

| Method                   | Threads |   Mean (ops/s) |         95% CI | Median (ops/s) |     StdDev |   CV% |            Min |            Max |             p5 |            p95 |
| ------------------------ | ------: | -------------: | -------------: | -------------: | ---------: | ----: | -------------: | -------------: | -------------: | -------------: |
| rsocket-8c-512w-1630992r |       1 |        1234141 |              0 |        1234141 |          0 |  0.0% |        1234141 |        1234141 |        1234141 |        1234141 |

## Latency (measured per-request)

| Method                   | Threads |     p50 (ns) |     p90 (ns) |     p99 (ns) |   p99.9 (ns) |     max (ns) |
| ------------------------ | ------: | -----------: | -----------: | -----------: | -----------: | -----------: |
| rsocket-8c-512w-1630992r |       1 |      2888049 |      3483913 |      4867088 |      9365496 |     44686630 |

## Latency (derived from throughput via Little's Law)

| Method                   | Threads |   Mean (ns/op) |     p5 (ns/op) |    p95 (ns/op) |
| ------------------------ | ------: | -------------: | -------------: | -------------: |
| rsocket-8c-512w-1630992r |       1 |            810 |            810 |            810 |

