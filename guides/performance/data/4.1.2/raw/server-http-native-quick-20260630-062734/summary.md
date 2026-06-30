# Benchmark Summary

**Results:** 60 data points | **Directory:** /home/dominic/git/sapl-policy-engine/sapl-benchmark/scripts/../results/server-http-native-quick-20260630-062734

| Scenario | Threads | Throughput | 95% CI | p50 (ns) | p99 (ns) | Latency CI (ns) |
|----------|---------|------------|--------|----------|----------|-----------------|
| baseline | 1P/32c | 45K ops/s | +/-4.2% | 0 | 9970000000 |  |
| baseline | 1P/64c | 45K ops/s | +/-3.2% | 0 | 9970000000 |  |
| baseline | 1P/128c | 45K ops/s | +/-1.0% | 0 | 9970000000 |  |
| baseline | 1P/256c | 44K ops/s | +/-4.3% | 0 | 9960000000 |  |
| baseline | 4P/32c | 173K ops/s | +/-3.9% | 0 | 9880000000 |  |
| baseline | 4P/64c | 173K ops/s | +/-1.0% | 0 | 9890000000 |  |
| baseline | 4P/128c | 173K ops/s | +/-4.8% | 0 | 9870000000 |  |
| baseline | 4P/256c | 172K ops/s | +/-0.7% | 0 | 9850000000 |  |
| baseline | 8P/32c | 308K ops/s | +/-10.3% | 0 | 9740000000 |  |
| baseline | 8P/64c | 273K ops/s | +/-1.3% | 0 | 9800000000 |  |
| baseline | 8P/128c | 262K ops/s | +/-8.6% | 0 | 9830000000 |  |
| baseline | 8P/256c | 258K ops/s | +/-4.1% | 0 | 9810000000 |  |
| hospital-1 | 1P/32c | 42K ops/s | +/-9.0% | 0 | 9970000000 |  |
| hospital-1 | 1P/64c | 41K ops/s | +/-0.7% | 0 | 9980000000 |  |
| hospital-1 | 1P/128c | 41K ops/s | +/-1.9% | 0 | 9980000000 |  |
| hospital-1 | 1P/256c | 41K ops/s | +/-4.2% | 0 | 9980000000 |  |
| hospital-1 | 4P/32c | 158K ops/s | +/-4.8% | 0 | 9900000000 |  |
| hospital-1 | 4P/64c | 158K ops/s | +/-0.4% | 0 | 9890000000 |  |
| hospital-1 | 4P/128c | 159K ops/s | +/-0.1% | 0 | 9880000000 |  |
| hospital-1 | 4P/256c | 158K ops/s | +/-0.6% | 0 | 9870000000 |  |
| hospital-1 | 8P/32c | 259K ops/s | +/-8.0% | 0 | 9780000000 |  |
| hospital-1 | 8P/64c | 244K ops/s | +/-12.9% | 0 | 9820000000 |  |
| hospital-1 | 8P/128c | 233K ops/s | +/-14.6% | 0 | 9840000000 |  |
| hospital-1 | 8P/256c | 229K ops/s | +/-10.1% | 0 | 9830000000 |  |
| hospital-100 | 1P/32c | 41K ops/s | +/-10.3% | 0 | 9970000000 |  |
| hospital-100 | 1P/64c | 40K ops/s | +/-3.1% | 0 | 9970000000 |  |
| hospital-100 | 1P/128c | 40K ops/s | +/-3.3% | 0 | 9970000000 |  |
| hospital-100 | 1P/256c | 40K ops/s | +/-0.6% | 0 | 9950000000 |  |
| hospital-100 | 4P/32c | 155K ops/s | +/-4.9% | 0 | 9900000000 |  |
| hospital-100 | 4P/64c | 156K ops/s | +/-3.4% | 0 | 9890000000 |  |
| hospital-100 | 4P/128c | 156K ops/s | +/-8.5% | 0 | 9890000000 |  |
| hospital-100 | 4P/256c | 155K ops/s | +/-6.8% | 0 | 9870000000 |  |
| hospital-100 | 8P/32c | 267K ops/s | +/-18.3% | 0 | 9780000000 |  |
| hospital-100 | 8P/64c | 251K ops/s | +/-1.5% | 0 | 9810000000 |  |
| hospital-100 | 8P/128c | 244K ops/s | +/-1.3% | 0 | 9840000000 |  |
| hospital-100 | 8P/256c | 247K ops/s | +/-12.3% | 0 | 9860000000 |  |
| hospital-300 | 1P/32c | 38K ops/s | +/-3.4% | 0 | 9980000000 |  |
| hospital-300 | 1P/64c | 39K ops/s | +/-1.6% | 0 | 9980000000 |  |
| hospital-300 | 1P/128c | 38K ops/s | +/-3.5% | 0 | 9970000000 |  |
| hospital-300 | 1P/256c | 38K ops/s | +/-1.0% | 0 | 9960000000 |  |
| hospital-300 | 4P/32c | 152K ops/s | +/-11.8% | 0 | 9880000000 |  |
| hospital-300 | 4P/64c | 154K ops/s | +/-4.7% | 0 | 9900000000 |  |
| hospital-300 | 4P/128c | 155K ops/s | +/-4.5% | 0 | 9890000000 |  |
| hospital-300 | 4P/256c | 154K ops/s | +/-5.4% | 0 | 9880000000 |  |
| hospital-300 | 8P/32c | 252K ops/s | +/-28.8% | 0 | 9790000000 |  |
| hospital-300 | 8P/64c | 244K ops/s | +/-2.1% | 0 | 9830000000 |  |
| hospital-300 | 8P/128c | 238K ops/s | +/-1.1% | 0 | 9830000000 |  |
| hospital-300 | 8P/256c | 236K ops/s | +/-11.8% | 0 | 9810000000 |  |
| rbac | 1P/32c | 42K ops/s | +/-7.2% | 0 | 9980000000 |  |
| rbac | 1P/64c | 42K ops/s | +/-2.7% | 0 | 9960000000 |  |
| rbac | 1P/128c | 42K ops/s | +/-4.8% | 0 | 9970000000 |  |
| rbac | 1P/256c | 41K ops/s | +/-6.6% | 0 | 9980000000 |  |
| rbac | 4P/32c | 162K ops/s | +/-4.1% | 0 | 9890000000 |  |
| rbac | 4P/64c | 162K ops/s | +/-3.9% | 0 | 9890000000 |  |
| rbac | 4P/128c | 162K ops/s | +/-0.9% | 0 | 9880000000 |  |
| rbac | 4P/256c | 162K ops/s | +/-1.7% | 0 | 9890000000 |  |
| rbac | 8P/32c | 277K ops/s | +/-6.9% | 0 | 9770000000 |  |
| rbac | 8P/64c | 258K ops/s | +/-19.6% | 0 | 9810000000 |  |
| rbac | 8P/128c | 245K ops/s | +/-10.8% | 0 | 9820000000 |  |
| rbac | 8P/256c | 244K ops/s | +/-29.3% | 0 | 9800000000 |  |
