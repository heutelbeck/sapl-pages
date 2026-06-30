# Benchmark Summary

**Results:** 60 data points | **Directory:** /home/dominic/git/sapl-policy-engine/sapl-benchmark/scripts/../results/server-http-jvm-quick-20260630-060124

| Scenario | Threads | Throughput | 95% CI | p50 (ns) | p99 (ns) | Latency CI (ns) |
|----------|---------|------------|--------|----------|----------|-----------------|
| baseline | 1P/32c | 102K ops/s | +/-2.1% | 0 | 9950000000 |  |
| baseline | 1P/64c | 101K ops/s | +/-7.7% | 0 | 9930000000 |  |
| baseline | 1P/128c | 101K ops/s | +/-1.5% | 0 | 9900000000 |  |
| baseline | 1P/256c | 100K ops/s | +/-1.4% | 0 | 9900000000 |  |
| baseline | 4P/32c | 331K ops/s | +/-2.9% | 0 | 9740000000 |  |
| baseline | 4P/64c | 340K ops/s | +/-11.2% | 0 | 9760000000 |  |
| baseline | 4P/128c | 342K ops/s | +/-7.1% | 0 | 9770000000 |  |
| baseline | 4P/256c | 340K ops/s | +/-6.0% | 0 | 9760000000 |  |
| baseline | 8P/32c | 533K ops/s | +/-2.0% | 0 | 9530000000 |  |
| baseline | 8P/64c | 581K ops/s | +/-11.1% | 0 | 9560000000 |  |
| baseline | 8P/128c | 603K ops/s | +/-12.6% | 0 | 9610000000 |  |
| baseline | 8P/256c | 617K ops/s | +/-5.6% | 0 | 9610000000 |  |
| hospital-1 | 1P/32c | 94K ops/s | +/-2.1% | 0 | 9950000000 |  |
| hospital-1 | 1P/64c | 94K ops/s | +/-1.2% | 0 | 9910000000 |  |
| hospital-1 | 1P/128c | 93K ops/s | +/-10.6% | 0 | 9910000000 |  |
| hospital-1 | 1P/256c | 93K ops/s | +/-6.1% | 0 | 9900000000 |  |
| hospital-1 | 4P/32c | 313K ops/s | +/-1.0% | 0 | 9760000000 |  |
| hospital-1 | 4P/64c | 320K ops/s | +/-10.1% | 0 | 9770000000 |  |
| hospital-1 | 4P/128c | 323K ops/s | +/-4.6% | 0 | 9770000000 |  |
| hospital-1 | 4P/256c | 324K ops/s | +/-6.8% | 0 | 9760000000 |  |
| hospital-1 | 8P/32c | 507K ops/s | +/-1.1% | 0 | 9540000000 |  |
| hospital-1 | 8P/64c | 550K ops/s | +/-10.4% | 0 | 9580000000 |  |
| hospital-1 | 8P/128c | 562K ops/s | +/-25.9% | 0 | 9630000000 |  |
| hospital-1 | 8P/256c | 577K ops/s | +/-2.3% | 0 | 9670000000 |  |
| hospital-100 | 1P/32c | 94K ops/s | +/-0.5% | 0 | 9950000000 |  |
| hospital-100 | 1P/64c | 94K ops/s | +/-2.5% | 0 | 9940000000 |  |
| hospital-100 | 1P/128c | 93K ops/s | +/-1.9% | 0 | 9900000000 |  |
| hospital-100 | 1P/256c | 93K ops/s | +/-1.4% | 0 | 9900000000 |  |
| hospital-100 | 4P/32c | 313K ops/s | +/-0.6% | 0 | 9760000000 |  |
| hospital-100 | 4P/64c | 318K ops/s | +/-0.3% | 0 | 9780000000 |  |
| hospital-100 | 4P/128c | 321K ops/s | +/-7.8% | 0 | 9790000000 |  |
| hospital-100 | 4P/256c | 320K ops/s | +/-3.1% | 0 | 9780000000 |  |
| hospital-100 | 8P/32c | 505K ops/s | +/-0.6% | 0 | 9540000000 |  |
| hospital-100 | 8P/64c | 548K ops/s | +/-7.4% | 0 | 9600000000 |  |
| hospital-100 | 8P/128c | 558K ops/s | +/-33.0% | 0 | 9600000000 |  |
| hospital-100 | 8P/256c | 571K ops/s | +/-1.8% | 0 | 9630000000 |  |
| hospital-300 | 1P/32c | 87K ops/s | +/-13.0% | 0 | 9950000000 |  |
| hospital-300 | 1P/64c | 86K ops/s | +/-7.3% | 0 | 9940000000 |  |
| hospital-300 | 1P/128c | 86K ops/s | +/-0.1% | 0 | 9910000000 |  |
| hospital-300 | 1P/256c | 85K ops/s | +/-2.3% | 0 | 9910000000 |  |
| hospital-300 | 4P/32c | 307K ops/s | +/-5.8% | 0 | 9760000000 |  |
| hospital-300 | 4P/64c | 312K ops/s | +/-7.9% | 0 | 9800000000 |  |
| hospital-300 | 4P/128c | 314K ops/s | +/-6.9% | 0 | 9790000000 |  |
| hospital-300 | 4P/256c | 315K ops/s | +/-7.3% | 0 | 9800000000 |  |
| hospital-300 | 8P/32c | 496K ops/s | +/-3.0% | 0 | 9550000000 |  |
| hospital-300 | 8P/64c | 533K ops/s | +/-9.4% | 0 | 9590000000 |  |
| hospital-300 | 8P/128c | 547K ops/s | +/-27.7% | 0 | 9630000000 |  |
| hospital-300 | 8P/256c | 558K ops/s | +/-3.2% | 0 | 9640000000 |  |
| rbac | 1P/32c | 96K ops/s | +/-7.0% | 0 | 9950000000 |  |
| rbac | 1P/64c | 97K ops/s | +/-4.4% | 0 | 9930000000 |  |
| rbac | 1P/128c | 96K ops/s | +/-4.9% | 0 | 9900000000 |  |
| rbac | 1P/256c | 96K ops/s | +/-1.7% | 0 | 9900000000 |  |
| rbac | 4P/32c | 322K ops/s | +/-1.6% | 0 | 9750000000 |  |
| rbac | 4P/64c | 330K ops/s | +/-12.8% | 0 | 9760000000 |  |
| rbac | 4P/128c | 332K ops/s | +/-8.0% | 0 | 9800000000 |  |
| rbac | 4P/256c | 325K ops/s | +/-29.2% | 0 | 9780000000 |  |
| rbac | 8P/32c | 513K ops/s | +/-2.1% | 0 | 9540000000 |  |
| rbac | 8P/64c | 559K ops/s | +/-9.8% | 0 | 9570000000 |  |
| rbac | 8P/128c | 577K ops/s | +/-17.0% | 0 | 9610000000 |  |
| rbac | 8P/256c | 579K ops/s | +/-18.1% | 0 | 9630000000 |  |
