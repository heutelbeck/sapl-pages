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
| Timestamp      | 20260630-083149        |
| JVM            | 25.0.4                 |
| OS             | Linux amd64            |
| CPUs           | 16                     |
| Label          | github-10_native_1p_90pct |

## Results

| Method                  | Threads |   Mean (ops/s) |         95% CI | Median (ops/s) |     StdDev |   CV% |            Min |            Max |             p5 |            p95 |
| ----------------------- | ------: | -------------: | -------------: | -------------: | ---------: | ----: | -------------: | -------------: | -------------: | -------------: |
| rsocket-8c-512w-162232r |       1 |         152210 |              0 |         152210 |          0 |  0.0% |         152210 |         152210 |         152210 |         152210 |

## Latency (measured per-request)

| Method                  | Threads |     p50 (ns) |     p90 (ns) |     p99 (ns) |   p99.9 (ns) |     max (ns) |
| ----------------------- | ------: | -----------: | -----------: | -----------: | -----------: | -----------: |
| rsocket-8c-512w-162232r |       1 |      3398345 |     12230039 |     43094942 |    268143774 |    357125038 |

## Latency (derived from throughput via Little's Law)

| Method                  | Threads |   Mean (ns/op) |     p5 (ns/op) |    p95 (ns/op) |
| ----------------------- | ------: | -------------: | -------------: | -------------: |
| rsocket-8c-512w-162232r |       1 |           6570 |           6570 |           6570 |

