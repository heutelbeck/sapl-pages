# Benchmark Summary

**Results:** 30 data points | **Directory:** /home/dominic/git/sapl-policy-engine/sapl-benchmark/scripts/../results/server-http-native-quick-20260630-075708

| Scenario | Threads | Throughput | 95% CI | p50 (ns) | p99 (ns) | Latency CI (ns) |
|----------|---------|------------|--------|----------|----------|-----------------|
| baseline | 1P/32c | 45K ops/s | +/-7.9% | 0 | 9970000000 |  |
| baseline | 1P/64c | 45K ops/s | +/-0.5% | 0 | 9970000000 |  |
| baseline | 4P/32c | 173K ops/s | +/-2.8% | 0 | 9880000000 |  |
| baseline | 4P/64c | 171K ops/s | +/-10.8% | 0 | 9880000000 |  |
| baseline | 8P/32c | 304K ops/s | +/-8.3% | 0 | 9750000000 |  |
| baseline | 8P/64c | 272K ops/s | +/-0.9% | 0 | 9810000000 |  |
| hospital-1 | 1P/32c | 41K ops/s | +/-11.0% | 0 | 9970000000 |  |
| hospital-1 | 1P/64c | 41K ops/s | +/-1.4% | 0 | 9970000000 |  |
| hospital-1 | 4P/32c | 159K ops/s | +/-2.1% | 0 | 9900000000 |  |
| hospital-1 | 4P/64c | 159K ops/s | +/-0.8% | 0 | 9880000000 |  |
| hospital-1 | 8P/32c | 274K ops/s | +/-9.6% | 0 | 9770000000 |  |
| hospital-1 | 8P/64c | 256K ops/s | +/-11.0% | 0 | 9820000000 |  |
| hospital-100 | 1P/32c | 41K ops/s | +/-8.0% | 0 | 9970000000 |  |
| hospital-100 | 1P/64c | 40K ops/s | +/-2.1% | 0 | 9970000000 |  |
| hospital-100 | 4P/32c | 157K ops/s | +/-1.5% | 0 | 9920000000 |  |
| hospital-100 | 4P/64c | 157K ops/s | +/-3.8% | 0 | 9900000000 |  |
| hospital-100 | 8P/32c | 272K ops/s | +/-21.4% | 0 | 9760000000 |  |
| hospital-100 | 8P/64c | 257K ops/s | +/-6.2% | 0 | 9810000000 |  |
| hospital-300 | 1P/32c | 38K ops/s | +/-4.0% | 0 | 9970000000 |  |
| hospital-300 | 1P/64c | 38K ops/s | +/-7.4% | 0 | 9970000000 |  |
| hospital-300 | 4P/32c | 153K ops/s | +/-12.9% | 0 | 9880000000 |  |
| hospital-300 | 4P/64c | 155K ops/s | +/-1.0% | 0 | 9900000000 |  |
| hospital-300 | 8P/32c | 236K ops/s | +/-5.6% | 0 | 9810000000 |  |
| hospital-300 | 8P/64c | 212K ops/s | +/-1.9% | 0 | 9840000000 |  |
| rbac | 1P/32c | 42K ops/s | +/-2.9% | 0 | 9970000000 |  |
| rbac | 1P/64c | 42K ops/s | +/-5.2% | 0 | 9980000000 |  |
| rbac | 4P/32c | 162K ops/s | +/-5.0% | 0 | 9890000000 |  |
| rbac | 4P/64c | 160K ops/s | +/-4.7% | 0 | 9870000000 |  |
| rbac | 8P/32c | 284K ops/s | +/-15.4% | 0 | 9760000000 |  |
| rbac | 8P/64c | 263K ops/s | +/-14.4% | 0 | 9810000000 |  |
