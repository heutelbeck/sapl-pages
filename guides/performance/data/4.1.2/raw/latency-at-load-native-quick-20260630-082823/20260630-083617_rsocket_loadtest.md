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
| Timestamp      | 20260630-083617        |
| JVM            | 25.0.4                 |
| OS             | Linux amd64            |
| CPUs           | 16                     |
| Label          | github-10_native_4p_1pct |

## Results

| Method                | Threads |   Mean (ops/s) |         95% CI | Median (ops/s) |     StdDev |   CV% |            Min |            Max |             p5 |            p95 |
| --------------------- | ------: | -------------: | -------------: | -------------: | ---------: | ----: | -------------: | -------------: | -------------: | -------------: |
| rsocket-8c-512w-6648r |       1 |           6644 |              0 |           6644 |          0 |  0.0% |           6644 |           6644 |           6644 |           6644 |

## Latency (measured per-request)

| Method                | Threads |     p50 (ns) |     p90 (ns) |     p99 (ns) |   p99.9 (ns) |     max (ns) |
| --------------------- | ------: | -----------: | -----------: | -----------: | -----------: | -----------: |
| rsocket-8c-512w-6648r |       1 |        41291 |        57844 |       766477 |      7963449 |     17484063 |

## Latency (derived from throughput via Little's Law)

| Method                | Threads |   Mean (ns/op) |     p5 (ns/op) |    p95 (ns/op) |
| --------------------- | ------: | -------------: | -------------: | -------------: |
| rsocket-8c-512w-6648r |       1 |         150514 |         150514 |         150514 |

