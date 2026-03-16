---
layout: default
title: Command Line
parent: SAPL Node
nav_order: 708
---

# Command Line

SAPL Node PDP server and policy CLI.

## Commands

- [`sapl`](#sapl) -- SAPL Node PDP server and policy CLI.
  - [`sapl server`](#sapl-server) -- Start the PDP server (default when no subcommand is given).
  - [`sapl bundle`](#sapl-bundle) -- Manage policy bundles for deployment.
    - [`sapl bundle create`](#sapl-bundle-create) -- Create a policy bundle from a directory.
    - [`sapl bundle sign`](#sapl-bundle-sign) -- Sign a policy bundle with an Ed25519 private key.
    - [`sapl bundle verify`](#sapl-bundle-verify) -- Verify a signed policy bundle against an Ed25519 public key.
    - [`sapl bundle inspect`](#sapl-bundle-inspect) -- Show bundle contents and metadata.
    - [`sapl bundle keygen`](#sapl-bundle-keygen) -- Generate an Ed25519 keypair for bundle signing.
  - [`sapl check`](#sapl-check) -- Evaluate authorization and exit with a decision code.
  - [`sapl decide`](#sapl-decide) -- Stream authorization decisions as NDJSON.
  - [`sapl decide-once`](#sapl-decide-once) -- Evaluate a single authorization decision and print the result as JSON.
  - [`sapl generate`](#sapl-generate) -- Generate authentication credentials for PDP server clients.
    - [`sapl generate basic`](#sapl-generate-basic) -- Generate HTTP Basic Auth credentials with Argon2id-encoded password.
    - [`sapl generate apikey`](#sapl-generate-apikey) -- Generate a Bearer token API key with Argon2id-encoded hash.
  - [`sapl test`](#sapl-test) -- Run SAPL tests and generate coverage reports.

## sapl server

Start the PDP server (default when no subcommand is given).

Launches the SAPL Policy Decision Point as an HTTP server. Clients
send authorization subscriptions via the HTTP API and receive
decisions as JSON responses or Server-Sent Event streams.

The server is configured via `application.yml`. Place it in a config/
subdirectory of the working directory, or specify a custom location
with --spring.config.location=file:/path/to/application.yml.

Any Spring Boot property can be overridden on the command line:
  --server.port=9090
  --io.sapl.pdp.embedded.pdp-config-type=BUNDLES
  --io.sapl.pdp.embedded.policies-path=/opt/policies

Key configuration areas: policy source type (DIRECTORY, BUNDLES),
authentication (no-auth, basic, API key, OAuth2), TLS, and
observability (health endpoints, Prometheus metrics).


**Synopsis**

```
sapl server [-hV]
```

**Options**

| Option | Description | Default |
|--------|-------------|---------|
| `-h, --help` | Show this help message and exit. |  |
| `-V, --version` | Print version information and exit. |  |

**Exit Codes**

| Code | Description |
|------|-------------|
| 0 | Clean shutdown |
| 1 | Startup or runtime error |

**Examples**

```shell
# Start with default settings
sapl server

# Start on a custom port
sapl server --server.port=9090

# Use a custom configuration file
sapl server --spring.config.location=file:/etc/sapl/application.yml
```

See Also: [sapl generate basic](#sapl-generate-basic), [sapl generate apikey](#sapl-generate-apikey)

## sapl bundle

Manage policy bundles for deployment.

Bundles package SAPL policies and PDP configuration into a single
`.saplbundle` file. They can be cryptographically signed with
Ed25519 keys for integrity verification at load time.


**Synopsis**

```
sapl bundle [-hV] [COMMAND]
```

**Options**

| Option | Description | Default |
|--------|-------------|---------|
| `-h, --help` | Show this help message and exit. |  |
| `-V, --version` | Print version information and exit. |  |

### sapl bundle create

Create a policy bundle from a directory.

Packages all `.sapl` policy files and `pdp.json` from the input
directory into a `.saplbundle` file. Policies are validated for
correct SAPL syntax during creation.

Optionally signs the bundle when a private key is provided.
This is equivalent to creating then running 'sapl bundle sign'.


**Synopsis**

```
sapl bundle create [-hV] -i=<inputDir> [-k=<keyFile>] [--key-id=<keyId>]
                          -o=<outputFile>
```

**Options**

| Option | Description | Default |
|--------|-------------|---------|
| `-i, --input <inputDir>` | Input directory containing policies |  |
| `-k, --key <keyFile>` | Ed25519 private key file (PEM format) for signing |  |
| `--key-id <keyId>` | Key identifier for rotation support | `default` |
| `-o, --output <outputFile>` | Output bundle file path |  |
| `-h, --help` | Show this help message and exit. |  |
| `-V, --version` | Print version information and exit. |  |

**Exit Codes**

| Code | Description |
|------|-------------|
| 0 | Bundle created successfully |
| 1 | Error (invalid input, no policies found, or I/O error) |

**Examples**

```shell
# Create an unsigned bundle
sapl bundle create -i ./policies -o policies.saplbundle

# Create and sign in one step
sapl bundle create -i ./policies -o policies.saplbundle -k signing.pem --key-id prod-2026
```

See Also: [sapl bundle sign](#sapl-bundle-sign), [sapl bundle keygen](#sapl-bundle-keygen)

### sapl bundle sign

Sign a policy bundle with an Ed25519 private key.

Creates a manifest containing SHA-256 hashes of all files in
the bundle and signs it with the provided Ed25519 private key.
The signature enables the PDP server to verify bundle integrity
and authenticity at load time.

By default, the input bundle is overwritten with the signed
version. Use `-o` to write to a different file.


**Synopsis**

```
sapl bundle sign [-hV] -b=<bundleFile> -k=<keyFile> [--key-id=<keyId>]
                        [-o=<outputFile>]
```

**Options**

| Option | Description | Default |
|--------|-------------|---------|
| `-b, --bundle <bundleFile>` | Bundle file to sign |  |
| `-k, --key <keyFile>` | Ed25519 private key file (PEM format) |  |
| `--key-id <keyId>` | Key identifier for rotation support | `default` |
| `-o, --output <outputFile>` | Output file (default: overwrites input) |  |
| `-h, --help` | Show this help message and exit. |  |
| `-V, --version` | Print version information and exit. |  |

**Exit Codes**

| Code | Description |
|------|-------------|
| 0 | Bundle signed successfully |
| 1 | Error (bundle or key not found, or signing failed) |

**Examples**

```shell
# Sign a bundle (overwrites the original)
sapl bundle sign -b policies.saplbundle -k signing.pem

# Sign and write to a new file
sapl bundle sign -b policies.saplbundle -k signing.pem -o signed.saplbundle --key-id prod-2026
```

See Also: [sapl bundle keygen](#sapl-bundle-keygen), [sapl bundle verify](#sapl-bundle-verify)

### sapl bundle verify

Verify a signed policy bundle against an Ed25519 public key.

Validates the bundle's Ed25519 signature and checks SHA-256
hashes of all files against the manifest. Reports the key ID,
creation timestamp, and number of verified files on success.


**Synopsis**

```
sapl bundle verify [-hV] -b=<bundleFile> -k=<keyFile>
```

**Options**

| Option | Description | Default |
|--------|-------------|---------|
| `-b, --bundle <bundleFile>` | Bundle file to verify |  |
| `-k, --key <keyFile>` | Ed25519 public key file (PEM format) |  |
| `-h, --help` | Show this help message and exit. |  |
| `-V, --version` | Print version information and exit. |  |

**Exit Codes**

| Code | Description |
|------|-------------|
| 0 | Verification successful |
| 1 | Verification failed, bundle not signed, or error |

**Examples**

```shell
# Verify a signed bundle
sapl bundle verify -b policies.saplbundle -k signing.pub
```

See Also: [sapl bundle sign](#sapl-bundle-sign), [sapl bundle inspect](#sapl-bundle-inspect)

### sapl bundle inspect

Show bundle contents and metadata.

Displays the signature status, PDP configuration (pdp.json),
and a list of all policies with their sizes. Useful for
auditing bundles before deployment.


**Synopsis**

```
sapl bundle inspect [-hV] -b=<bundleFile>
```

**Options**

| Option | Description | Default |
|--------|-------------|---------|
| `-b, --bundle <bundleFile>` | Bundle file to inspect |  |
| `-h, --help` | Show this help message and exit. |  |
| `-V, --version` | Print version information and exit. |  |

**Exit Codes**

| Code | Description |
|------|-------------|
| 0 | Inspection completed |
| 1 | Error reading bundle |

**Examples**

```shell
# Show bundle contents and signature status
sapl bundle inspect -b policies.saplbundle
```

See Also: [sapl bundle verify](#sapl-bundle-verify)

### sapl bundle keygen

Generate an Ed25519 keypair for bundle signing.

Creates a PKCS#8 PEM-encoded private key (<prefix>.pem) and
an X.509 PEM-encoded public key (<prefix>.pub). The private
key is used with 'sapl bundle sign' or 'sapl bundle create
-k'. The public key is configured on the PDP server to verify
bundle signatures.


**Synopsis**

```
sapl bundle keygen [-hV] [--force] -o=<outputPrefix>
```

**Options**

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <outputPrefix>` | Output file prefix (creates <prefix>.pem and <prefix>.pub) |  |
| `--force` | Overwrite existing files |  |
| `-h, --help` | Show this help message and exit. |  |
| `-V, --version` | Print version information and exit. |  |

**Exit Codes**

| Code | Description |
|------|-------------|
| 0 | Keypair generated |
| 1 | Error (file exists without --force, or generation failed) |

**Examples**

```shell
# Generate a new signing keypair
sapl bundle keygen -o signing-key

# Overwrite existing key files
sapl bundle keygen -o signing-key --force
```

See Also: [sapl bundle sign](#sapl-bundle-sign), [sapl bundle create](#sapl-bundle-create)

## sapl check

Evaluate authorization and exit with a decision code.

Evaluates a single authorization subscription against policies and
exits with a code that encodes the decision. No output is written
to stdout, making this command ideal for shell scripts and CI/CD
pipelines.

By default, policies are loaded from ~/.sapl/. Use
`--dir` for a different directory, `--bundle` for a bundle file, or
`--remote` to query a running PDP server.


**Synopsis**

```
sapl check [-hV] [--json-report] [--text-report] [--trace] [--remote
                  [--url=<url>] [--insecure] [--basic-auth=<basicAuth> |
                  --token=<token>]] [--dir=<dir> | --bundle=<bundle>]
                  [--public-key=<publicKey> | --no-verify] [-f=<file> |
                  [-s=<subject> -a=<action> -r=<resource> [-e=<environment>]
                  [--secrets=<secrets>]]]
```

**Options**


*Remote Connection:*

| Option | Description | Default |
|--------|-------------|---------|
| `--remote` | Connect to a remote PDP server instead of evaluating locally |  |
| `--url <url>` | Remote PDP URL (default: http://localhost:8443, env: SAPL_URL) | `http://localhost:8443` |
| `--insecure` | Skip TLS certificate verification (development only) |  |
| `--basic-auth <basicAuth>` | HTTP Basic credentials as user:password (env: SAPL_BASIC_AUTH) |  |
| `--token <token>` | Bearer token for API key or JWT (env: SAPL_BEARER_TOKEN) |  |

*Policy Source:*

| Option | Description | Default |
|--------|-------------|---------|
| `--dir <dir>` | Directory containing `.sapl` policy files and `pdp.json` |  |
| `--bundle <bundle>` | Policy bundle file (.saplbundle) |  |

*Bundle Verification:*

| Option | Description | Default |
|--------|-------------|---------|
| `--public-key <publicKey>` | Ed25519 public key file (PEM) for bundle signature verification |  |
| `--no-verify` | Skip bundle signature verification (development only) |  |

*Subscription Input:*

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --file <file>` | Read authorization subscription from a JSON file. Use - for stdin. |  |
| `-s, --subject <subject>` | Subject as a JSON value (string, number, object, or array) |  |
| `-a, --action <action>` | Action as a JSON value (string, number, object, or array) |  |
| `-r, --resource <resource>` | Resource as a JSON value (string, number, object, or array) |  |
| `-e, --environment <environment>` | Environment as a JSON value (optional context for policy evaluation) |  |
| `--secrets <secrets>` | Secrets as a JSON object (available to policies via the secrets() function) |  |
| `--trace` | Print the full policy evaluation trace to stderr |  |
| `--json-report` | Print a machine-readable JSON evaluation report to stderr |  |
| `--text-report` | Print a human-readable text evaluation report to stderr |  |
| `-h, --help` | Show this help message and exit. |  |
| `-V, --version` | Print version information and exit. |  |

**Exit Codes**

| Code | Description |
|------|-------------|
| 0 | PERMIT without obligations or resource transformation |
| 1 | Error during evaluation |
| 2 | DENY |
| 3 | NOT_APPLICABLE (no matching policy) |
| 4 | INDETERMINATE, or PERMIT with obligations/resource transformation |

**Examples**

```shell
# Check using local policies
sapl check --dir ./policies -s '"alice"' -a '"read"' -r '"doc"'

# Use as a CI/CD gate (exit 0 means PERMIT)
if sapl check --bundle policies.saplbundle -s '"ci"' -a '"deploy"' -r '"prod"'; then echo "Permitted"; fi

# Read subscription from stdin
echo '{"subject":"alice","action":"read","resource":"doc"}' | sapl check -f -

# Query a remote PDP server
sapl check --remote --url https://pdp.example.com --token $SAPL_BEARER_TOKEN -s '"alice"' -a '"read"' -r '"doc"'
```

See Also: [sapl decide once](#sapl-decide-once), [sapl decide](#sapl-decide)

## sapl decide

Stream authorization decisions as NDJSON.

Subscribes to the policy decision point and prints each decision as
a JSON line to stdout (Newline Delimited JSON). When policies change,
attributes update, or the subscription context evolves, a new
decision line is emitted automatically.

Runs until interrupted (Ctrl+C) or the decision stream completes.

By default, policies are loaded from ~/.sapl/. Use
`--dir` for a different directory, `--bundle` for a bundle file, or
`--remote` to query a running PDP server.


**Synopsis**

```
sapl decide [-hV] [--json-report] [--text-report] [--trace] [--remote
                   [--url=<url>] [--insecure] [--basic-auth=<basicAuth> |
                   --token=<token>]] [--dir=<dir> | --bundle=<bundle>]
                   [--public-key=<publicKey> | --no-verify] [-f=<file> |
                   [-s=<subject> -a=<action> -r=<resource> [-e=<environment>]
                   [--secrets=<secrets>]]]
```

**Options**


*Remote Connection:*

| Option | Description | Default |
|--------|-------------|---------|
| `--remote` | Connect to a remote PDP server instead of evaluating locally |  |
| `--url <url>` | Remote PDP URL (default: http://localhost:8443, env: SAPL_URL) | `http://localhost:8443` |
| `--insecure` | Skip TLS certificate verification (development only) |  |
| `--basic-auth <basicAuth>` | HTTP Basic credentials as user:password (env: SAPL_BASIC_AUTH) |  |
| `--token <token>` | Bearer token for API key or JWT (env: SAPL_BEARER_TOKEN) |  |

*Policy Source:*

| Option | Description | Default |
|--------|-------------|---------|
| `--dir <dir>` | Directory containing `.sapl` policy files and `pdp.json` |  |
| `--bundle <bundle>` | Policy bundle file (.saplbundle) |  |

*Bundle Verification:*

| Option | Description | Default |
|--------|-------------|---------|
| `--public-key <publicKey>` | Ed25519 public key file (PEM) for bundle signature verification |  |
| `--no-verify` | Skip bundle signature verification (development only) |  |

*Subscription Input:*

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --file <file>` | Read authorization subscription from a JSON file. Use - for stdin. |  |
| `-s, --subject <subject>` | Subject as a JSON value (string, number, object, or array) |  |
| `-a, --action <action>` | Action as a JSON value (string, number, object, or array) |  |
| `-r, --resource <resource>` | Resource as a JSON value (string, number, object, or array) |  |
| `-e, --environment <environment>` | Environment as a JSON value (optional context for policy evaluation) |  |
| `--secrets <secrets>` | Secrets as a JSON object (available to policies via the secrets() function) |  |
| `--trace` | Print the full policy evaluation trace to stderr |  |
| `--json-report` | Print a machine-readable JSON evaluation report to stderr |  |
| `--text-report` | Print a human-readable text evaluation report to stderr |  |
| `-h, --help` | Show this help message and exit. |  |
| `-V, --version` | Print version information and exit. |  |

**Exit Codes**

| Code | Description |
|------|-------------|
| 0 | Clean shutdown (stream completed or interrupted) |
| 1 | Error during evaluation |

**Examples**

```shell
# Stream decisions using local policies (Ctrl+C to stop)
sapl decide --dir ./policies -s '"alice"' -a '"read"' -r '"doc"'

# Stream from a remote PDP server
sapl decide --remote --token $SAPL_BEARER_TOKEN -s '"alice"' -a '"read"' -r '"doc"'

# Read subscription from a JSON file
sapl decide -f request.json --bundle policies.saplbundle
```

See Also: [sapl decide once](#sapl-decide-once), [sapl check](#sapl-check)

## sapl decide-once

Evaluate a single authorization decision and print the result as JSON.

Evaluates the authorization subscription against policies once and
prints the full decision to stdout as a JSON object containing the
decision (PERMIT, DENY, NOT_APPLICABLE, INDETERMINATE), any
obligations, advice, and resource transformations.

By default, policies are loaded from ~/.sapl/. Use
`--dir` for a different directory, `--bundle` for a bundle file, or
`--remote` to query a running PDP server.


**Synopsis**

```
sapl decide-once [-hV] [--json-report] [--text-report] [--trace]
                        [--remote [--url=<url>] [--insecure]
                        [--basic-auth=<basicAuth> | --token=<token>]]
                        [--dir=<dir> | --bundle=<bundle>]
                        [--public-key=<publicKey> | --no-verify] [-f=<file> |
                        [-s=<subject> -a=<action> -r=<resource>
                        [-e=<environment>] [--secrets=<secrets>]]]
```

**Options**


*Remote Connection:*

| Option | Description | Default |
|--------|-------------|---------|
| `--remote` | Connect to a remote PDP server instead of evaluating locally |  |
| `--url <url>` | Remote PDP URL (default: http://localhost:8443, env: SAPL_URL) | `http://localhost:8443` |
| `--insecure` | Skip TLS certificate verification (development only) |  |
| `--basic-auth <basicAuth>` | HTTP Basic credentials as user:password (env: SAPL_BASIC_AUTH) |  |
| `--token <token>` | Bearer token for API key or JWT (env: SAPL_BEARER_TOKEN) |  |

*Policy Source:*

| Option | Description | Default |
|--------|-------------|---------|
| `--dir <dir>` | Directory containing `.sapl` policy files and `pdp.json` |  |
| `--bundle <bundle>` | Policy bundle file (.saplbundle) |  |

*Bundle Verification:*

| Option | Description | Default |
|--------|-------------|---------|
| `--public-key <publicKey>` | Ed25519 public key file (PEM) for bundle signature verification |  |
| `--no-verify` | Skip bundle signature verification (development only) |  |

*Subscription Input:*

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --file <file>` | Read authorization subscription from a JSON file. Use - for stdin. |  |
| `-s, --subject <subject>` | Subject as a JSON value (string, number, object, or array) |  |
| `-a, --action <action>` | Action as a JSON value (string, number, object, or array) |  |
| `-r, --resource <resource>` | Resource as a JSON value (string, number, object, or array) |  |
| `-e, --environment <environment>` | Environment as a JSON value (optional context for policy evaluation) |  |
| `--secrets <secrets>` | Secrets as a JSON object (available to policies via the secrets() function) |  |
| `--trace` | Print the full policy evaluation trace to stderr |  |
| `--json-report` | Print a machine-readable JSON evaluation report to stderr |  |
| `--text-report` | Print a human-readable text evaluation report to stderr |  |
| `-h, --help` | Show this help message and exit. |  |
| `-V, --version` | Print version information and exit. |  |

**Exit Codes**

| Code | Description |
|------|-------------|
| 0 | Decision printed successfully |
| 1 | Error during evaluation |

**Examples**

```shell
# Evaluate using local policies
sapl decide-once --dir ./policies -s '"alice"' -a '"read"' -r '"doc"'

# Read subscription from a JSON file
sapl decide-once -f request.json --bundle policies.saplbundle

# Read subscription from stdin
echo '{"subject":"alice","action":"read","resource":"doc"}' | sapl decide-once -f -

# Query a remote PDP server with a complex subject
sapl decide-once --remote --token $SAPL_BEARER_TOKEN -s '{"role":"admin"}' -a '"write"' -r '"config"'
```

See Also: [sapl check](#sapl-check), [sapl decide](#sapl-decide)

## sapl generate

Generate authentication credentials for PDP server clients.

Creates credentials with Argon2id-encoded hashes and outputs
ready-to-use configuration snippets for `application.yml`.
Credentials can use HTTP Basic Auth or API key (Bearer token).


**Synopsis**

```
sapl generate [-hV] [COMMAND]
```

**Options**

| Option | Description | Default |
|--------|-------------|---------|
| `-h, --help` | Show this help message and exit. |  |
| `-V, --version` | Print version information and exit. |  |

### sapl generate basic

Generate HTTP Basic Auth credentials with Argon2id-encoded password.

Creates a random username and password, encodes the password
with Argon2id, and prints the credentials along with an
`application.yml` configuration snippet and a curl usage example.

Store the plaintext password securely. Only the Argon2id hash
goes into server configuration.


**Synopsis**

```
sapl generate basic [-hV] [-i=<userId>] [-p=<pdpId>]
```

**Options**

| Option | Description | Default |
|--------|-------------|---------|
| `-i, --id <userId>` | User ID (default: generated) |  |
| `-p, --pdp-id <pdpId>` | PDP ID for routing (default: 'default') | `default` |
| `-h, --help` | Show this help message and exit. |  |
| `-V, --version` | Print version information and exit. |  |

**Exit Codes**

| Code | Description |
|------|-------------|
| 0 | Credentials generated successfully |
| 1 | Error during generation |

**Examples**

```shell
# Generate random credentials
sapl generate basic

# Generate with custom ID and PDP routing
sapl generate basic --id my-client --pdp-id production
```

See Also: [sapl generate apikey](#sapl-generate-apikey), [sapl server](#sapl-server)

### sapl generate apikey

Generate a Bearer token API key with Argon2id-encoded hash.

Creates an API key with the format sapl_<random> and encodes
it with Argon2id. Prints the key along with an `application.yml`
configuration snippet and a curl usage example.

The API key is used as a Bearer token in the Authorization
header.


**Synopsis**

```
sapl generate apikey [-hV] [-i=<userId>] [-p=<pdpId>]
```

**Options**

| Option | Description | Default |
|--------|-------------|---------|
| `-i, --id <userId>` | User ID (default: generated) |  |
| `-p, --pdp-id <pdpId>` | PDP ID for routing (default: 'default') | `default` |
| `-h, --help` | Show this help message and exit. |  |
| `-V, --version` | Print version information and exit. |  |

**Exit Codes**

| Code | Description |
|------|-------------|
| 0 | API key generated successfully |
| 1 | Error during generation |

**Examples**

```shell
# Generate a random API key
sapl generate apikey

# Generate with custom ID and PDP routing
sapl generate apikey --id my-service --pdp-id production
```

See Also: [sapl generate basic](#sapl-generate-basic), [sapl server](#sapl-server)

## sapl test

Run SAPL tests and generate coverage reports.

Discovers `.sapl` policy files and .sapltest test files from a directory,
executes all test scenarios, and generates coverage reports. Policies
and tests are matched by the document names referenced in the test
files.

Policies are discovered from --dir. Tests are discovered from `--testdir`
if specified, otherwise from --dir.

Coverage data is written to the output directory as coverage.ndjson.
HTML and SonarQube reports can be generated from this data.

Quality gate thresholds can be configured to fail the command when
coverage ratios are below the required percentages.


**Synopsis**

```
sapl test [-hV] [--[no-]html] [--[no-]sonar]
                 [--branch-coverage-ratio=<branchCoverageRatio>]
                 [--condition-hit-ratio=<conditionHitRatio>] [--dir=<dir>]
                 [--output=<output>] [--policy-hit-ratio=<policyHitRatio>]
                 [--policy-set-hit-ratio=<policySetHitRatio>]
                 [--testdir=<testdir>]
```

**Options**

| Option | Description | Default |
|--------|-------------|---------|
| `--dir <dir>` | Directory containing `.sapl` policy files | `.` |
| `--testdir <testdir>` | Directory containing .sapltest test files (default: same as --dir) |  |
| `--output <output>` | Output directory for coverage data and reports | `./sapl-coverage` |
| `--html` | Generate HTML coverage report | `true` |
| `--sonar` | Generate SonarQube coverage report | `false` |
| `--policy-set-hit-ratio <policySetHitRatio>` | Required policy set hit ratio, 0-100 (0 = disabled) | `0` |
| `--policy-hit-ratio <policyHitRatio>` | Required policy hit ratio, 0-100 (0 = disabled) | `0` |
| `--condition-hit-ratio <conditionHitRatio>` | Required condition hit ratio, 0-100 (0 = disabled) | `0` |
| `--branch-coverage-ratio <branchCoverageRatio>` | Required branch coverage ratio, 0-100 (0 = disabled) | `0` |
| `-h, --help` | Show this help message and exit. |  |
| `-V, --version` | Print version information and exit. |  |

**Exit Codes**

| Code | Description |
|------|-------------|
| 0 | All tests passed (and quality gate met, if configured) |
| 1 | Error during test execution (I/O, parse errors) |
| 2 | One or more tests failed |
| 3 | Quality gate not met (tests passed but coverage below threshold) |

**Examples**

```shell
# Run tests from current directory
sapl test

# Run tests from a specific directory
sapl test --dir ./my-policies

# Policies in one directory, tests in another
sapl test --dir ./policies --testdir ./tests

# Generate only SonarQube report (no HTML)
sapl test --no-html --sonar

# Custom output directory
sapl test --output ./reports/sapl-coverage

# Enforce a coverage threshold
sapl test --policy-hit-ratio 80
```

See Also: [sapl check](#sapl-check), [sapl decide](#sapl-decide)

