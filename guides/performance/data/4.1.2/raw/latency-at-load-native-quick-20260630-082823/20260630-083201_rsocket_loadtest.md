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
| Timestamp      | 20260630-083201        |
| JVM            | 25.0.4                 |
| OS             | Linux amd64            |
| CPUs           | 16                     |
| Label          | github-10_native_1p_saturation |

## Results

| Method          | Threads |   Mean (ops/s) |         95% CI | Median (ops/s) |     StdDev |   CV% |            Min |            Max |             p5 |            p95 |
| --------------- | ------: | -------------: | -------------: | -------------: | ---------: | ----: | -------------: | -------------: | -------------: | -------------: |
| rsocket-8c-512w |       1 |         176358 |              0 |         176358 |          0 |  0.0% |         176358 |         176358 |         176358 |         176358 |

## Latency (measured per-request)

| Method          | Threads |     p50 (ns) |     p90 (ns) |     p99 (ns) |   p99.9 (ns) |     max (ns) |
| --------------- | ------: | -----------: | -----------: | -----------: | -----------: | -----------: |
| rsocket-8c-512w |       1 |     21275612 |     36843971 |     57662158 |     78048446 |    111508491 |

## Latency (derived from throughput via Little's Law)

| Method          | Threads |   Mean (ns/op) |     p5 (ns/op) |    p95 (ns/op) |
| --------------- | ------: | -------------: | -------------: | -------------: |
| rsocket-8c-512w |       1 |           5670 |           5670 |           5670 |

