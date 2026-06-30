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
| Timestamp      | 20260630-083126        |
| JVM            | 25.0.4                 |
| OS             | Linux amd64            |
| CPUs           | 16                     |
| Label          | github-10_native_1p_10pct |

## Results

| Method                 | Threads |   Mean (ops/s) |         95% CI | Median (ops/s) |     StdDev |   CV% |            Min |            Max |             p5 |            p95 |
| ---------------------- | ------: | -------------: | -------------: | -------------: | ---------: | ----: | -------------: | -------------: | -------------: | -------------: |
| rsocket-8c-512w-18025r |       1 |          18021 |              0 |          18021 |          0 |  0.0% |          18021 |          18021 |          18021 |          18021 |

## Latency (measured per-request)

| Method                 | Threads |     p50 (ns) |     p90 (ns) |     p99 (ns) |   p99.9 (ns) |     max (ns) |
| ---------------------- | ------: | -----------: | -----------: | -----------: | -----------: | -----------: |
| rsocket-8c-512w-18025r |       1 |        41286 |        50237 |      1210576 |     10368690 |     19315601 |

## Latency (derived from throughput via Little's Law)

| Method                 | Threads |   Mean (ns/op) |     p5 (ns/op) |    p95 (ns/op) |
| ---------------------- | ------: | -------------: | -------------: | -------------: |
| rsocket-8c-512w-18025r |       1 |          55492 |          55492 |          55492 |

