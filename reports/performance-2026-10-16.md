# Raspberry Pi performance comparison — 16 October 2026

All four performance priorities were implemented, tested, committed separately,
pushed to origin, and deployed to `pi@raspberrypi`.

| Priority | Commit    | Change                                                                                                                     |
| -------- | --------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1        | `acb21cd` | Prune out-of-window grouping candidates; cache dashboard snapshots with expiry, database invalidation and bounded storage. |
| 2        | `3c1428a` | Apply date, publisher, saved and unread filters in SQLite; remove the global 3,000-row history cutoff.                     |
| 3        | `3d8df60` | Omit unused archive lists; cache serialised responses and asynchronous gzip compression.                                   |
| 4        | `3e5c159` | Return conditional 304 responses; preserve unchanged dashboard sections/cards, expanded coverage and button focus.         |

## Method

Measurements ran over SSH on the Pi itself, using Node 24.22.0 on ARM64. The old
running image was saved before deployment. Both images used the same consistent
SQLite snapshot containing 3,828 articles, in isolated containers with feed
collection disabled. Production bookmarks and preferences were not modified by
the benchmark.

The main workload comprised 40 dashboard requests, 20 history requests, 20 council
searches, 10 saved-view requests and 40 unchanged dashboard polls, following
warm-up requests. Requests used a persistent localhost HTTP connection and
advertised gzip support. Payload sizes count transferred response bodies;
headers are excluded. Node CPU time was read from `/proc/<pid>/stat`, and memory
from `/proc/<pid>/status`.

A separate ten-request test per image invalidated the dashboard cache before
each request using a settings write in the isolated benchmark database. This
measures fresh processing rather than cache hits. Its CPU time is not included
in the main workload total below.

## Results

| Metric                               |             Before |         After |     Improvement |
| ------------------------------------ | -----------------: | ------------: | --------------: |
| Uncached dashboard median            |         923.810 ms |    258.049 ms |     72.1% lower |
| Warm dashboard median                |         834.335 ms |      3.344 ms |     99.6% lower |
| Warm history median                  |         882.843 ms |      3.569 ms |     99.6% lower |
| History response body                |      931,433 bytes |  24,247 bytes |   97.4% smaller |
| Dashboard response body              |       85,352 bytes |  29,521 bytes |   65.4% smaller |
| Unchanged poll response body         | 85,352 bytes (200) | 0 bytes (304) | Body eliminated |
| Node CPU time, 130 measured requests |      78.27 seconds |  0.31 seconds |      99.6% less |
| Peak Node RSS during main workload   |         233.99 MiB |    131.12 MiB |     44.0% lower |

Warm results reflect cache reuse. The CPU reduction applies to this request
workload, rather than the whole Pi or its background feed collection. Measurements
were sequential on a shared Pi; latency is subject to other host activity.

Docker reported zero memory usage and warned that the host kernel cannot enforce
the configured memory limit. The RAM figures above are measured process RSS,
not Docker estimates. CPU settings were the same for both benchmark containers.

## Reliability verification

- All 120 displayed homepage articles were identical between images, including
  their metadata and other coverage; section deduplication remained intact.
- History retained the previous results and increased from 2,918 to 3,730 grouped
  stories after removing the global cutoff. Council search increased from 53 to
  62 results while preserving its previous results.
- Regression tests cover older saved articles, Unicode search, date and unread
  filtering, cache invalidation after local/external database writes, cache limits
  and expiry, gzip negotiation, conditional polling, and incremental rendering.
- All 18 tests passed locally and on the Pi's production Node 24 image. The API
  test's first-run startup allowance was increased from five to fifteen seconds
  after confirming that the Pi required more than five seconds for fresh SQLite
  setup; the complete Pi suite then passed in approximately eight seconds.
- The deployed service is healthy. The news endpoint serves gzip and conditional
  304 responses; all new browser modules are served correctly. The reader route
  and both home buttons remain available, and existing direct-source preferences
  are respected.

Temporary benchmark containers and their database copies were removed after the
checks. The saved pre-change image remains available as
`quiet-news-performance-before` for rollback.
