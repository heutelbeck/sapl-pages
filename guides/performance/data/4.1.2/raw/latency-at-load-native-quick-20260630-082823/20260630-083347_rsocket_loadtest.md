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
| Timestamp      | 20260630-083347        |
| JVM            | 25.0.4                 |
| OS             | Linux amd64            |
| CPUs           | 16                     |
| Label          | hospital-300_native_4p_1pct |

## Results

| Method                | Threads |   Mean (ops/s) |         95% CI | Median (ops/s) |     StdDev |   CV% |            Min |            Max |             p5 |            p95 |
| --------------------- | ------: | -------------: | -------------: | -------------: | ---------: | ----: | -------------: | -------------: | -------------: | -------------: |
| rsocket-8c-512w-5405r |       1 |           5395 |              0 |           5395 |          0 |  0.0% |           5395 |           5395 |           5395 |           5395 |

## Latency (measured per-request)

| Method                | Threads |     p50 (ns) |     p90 (ns) |     p99 (ns) |   p99.9 (ns) |     max (ns) |
| --------------------- | ------: | -----------: | -----------: | -----------: | -----------: | -----------: |
| rsocket-8c-512w-5405r |       1 |        43886 |        65397 |      4175323 |     62430231 |     72466805 |

## Latency (derived from throughput via Little's Law)

| Method                | Threads |   Mean (ns/op) |     p5 (ns/op) |    p95 (ns/op) |
| --------------------- | ------: | -------------: | -------------: | -------------: |
| rsocket-8c-512w-5405r |       1 |         185359 |         185359 |         185359 |

