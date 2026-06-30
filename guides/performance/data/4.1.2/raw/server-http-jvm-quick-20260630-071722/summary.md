# Benchmark Summary

**Results:** 30 data points | **Directory:** /home/dominic/git/sapl-policy-engine/sapl-benchmark/scripts/../results/server-http-jvm-quick-20260630-071722

| Scenario | Threads | Throughput | 95% CI | p50 (ns) | p99 (ns) | Latency CI (ns) |
|----------|---------|------------|--------|----------|----------|-----------------|
| baseline | 1P/32c | 102K ops/s | +/-2.8% | 0 | 9940000000 |  |
| baseline | 1P/64c | 101K ops/s | +/-14.7% | 0 | 9930000000 |  |
| baseline | 4P/32c | 330K ops/s | +/-0.8% | 0 | 9760000000 |  |
| baseline | 4P/64c | 333K ops/s | +/-15.1% | 0 | 9780000000 |  |
| baseline | 8P/32c | 532K ops/s | +/-0.9% | 0 | 9520000000 |  |
| baseline | 8P/64c | 576K ops/s | +/-10.7% | 0 | 9570000000 |  |
| hospital-1 | 1P/32c | 95K ops/s | +/-9.4% | 0 | 9950000000 |  |
| hospital-1 | 1P/64c | 96K ops/s | +/-2.0% | 0 | 9930000000 |  |
| hospital-1 | 4P/32c | 315K ops/s | +/-2.1% | 0 | 9760000000 |  |
| hospital-1 | 4P/64c | 320K ops/s | +/-2.7% | 0 | 9800000000 |  |
| hospital-1 | 8P/32c | 495K ops/s | +/-11.8% | 0 | 9560000000 |  |
| hospital-1 | 8P/64c | 542K ops/s | +/-11.7% | 0 | 9580000000 |  |
| hospital-100 | 1P/32c | 92K ops/s | +/-3.9% | 0 | 9950000000 |  |
| hospital-100 | 1P/64c | 93K ops/s | +/-4.7% | 0 | 9930000000 |  |
| hospital-100 | 4P/32c | 311K ops/s | +/-6.4% | 0 | 9760000000 |  |
| hospital-100 | 4P/64c | 317K ops/s | +/-5.8% | 0 | 9800000000 |  |
| hospital-100 | 8P/32c | 500K ops/s | +/-2.7% | 0 | 9550000000 |  |
| hospital-100 | 8P/64c | 543K ops/s | +/-7.1% | 0 | 9590000000 |  |
| hospital-300 | 1P/32c | 87K ops/s | +/-5.1% | 0 | 9950000000 |  |
| hospital-300 | 1P/64c | 86K ops/s | +/-9.0% | 0 | 9940000000 |  |
| hospital-300 | 4P/32c | 301K ops/s | +/-2.4% | 0 | 9770000000 |  |
| hospital-300 | 4P/64c | 308K ops/s | +/-10.3% | 0 | 9770000000 |  |
| hospital-300 | 8P/32c | 493K ops/s | +/-0.3% | 0 | 9560000000 |  |
| hospital-300 | 8P/64c | 533K ops/s | +/-11.7% | 0 | 9620000000 |  |
| rbac | 1P/32c | 97K ops/s | +/-4.4% | 0 | 9940000000 |  |
| rbac | 1P/64c | 97K ops/s | +/-3.5% | 0 | 9930000000 |  |
| rbac | 4P/32c | 319K ops/s | +/-3.3% | 0 | 9760000000 |  |
| rbac | 4P/64c | 321K ops/s | +/-5.0% | 0 | 9760000000 |  |
| rbac | 8P/32c | 515K ops/s | +/-1.3% | 0 | 9540000000 |  |
| rbac | 8P/64c | 558K ops/s | +/-5.9% | 0 | 9570000000 |  |
