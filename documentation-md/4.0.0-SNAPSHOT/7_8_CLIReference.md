---
layout: default
title: CLI Reference
parent: The SAPL Node
grand_parent: SAPL Reference
nav_order: 8
---

# CLI Reference

SAPL Policy Decision Point Server and authorization policy toolkit.

Without a subcommand, starts the PDP server on localhost:8443.
Use subcommands to evaluate policies, manage bundles, and
generate credentials without starting the server.


## Commands

- `sapl` - SAPL Policy Decision Point Server and authorization policy toolkit.

Without a subcommand, starts the PDP server on localhost:8443.
Use subcommands to evaluate policies, manage bundles, and
generate credentials without starting the server.

  - `sapl server` - Start the PDP server (default when no command is given).

Launches the SAPL Policy Decision Point as an HTTP server. Clients send
authorization subscriptions via the HTTP API and receive decisions
as JSON responses or Server-Sent Event streams.

The server is configured via application.yml. Place it in a config/
subdirectory of the working directory, or specify a custom location
with --spring.config.location=file:/path/to/application.yml.

Any Spring Boot property can be overridden on the command line:
  --server.port=9090
  --io.sapl.pdp.embedded.pdp-config-type=BUNDLES
  --io.sapl.pdp.embedded.policies-path=/opt/policies

Key configuration areas: policy source type (DIRECTORY, BUNDLES),
authentication (no-auth, basic, API key, OAuth2), TLS, and
observability (health endpoints, Prometheus metrics).

  - `sapl bundle` - Policy bundle operations.

Bundles package SAPL policies and PDP configuration into a single
file for deployment. They can be cryptographically signed with
Ed25519 keys for integrity verification.

    - `sapl bundle create` - Create a policy bundle from a directory.

Packages all .sapl policy files and pdp.json from the input directory
into a .saplbundle file. Policies are validated for correct SAPL
syntax during creation.

Optionally signs the bundle during creation when a private key is
provided. This is equivalent to creating an unsigned bundle and
then running 'sapl bundle sign' separately.

    - `sapl bundle sign` - Sign a policy bundle with an Ed25519 private key.

Creates a manifest containing SHA-256 hashes of all files in the
bundle and signs it with the provided Ed25519 private key. The
signature enables the PDP server to verify bundle integrity and
authenticity at load time.

By default, the input bundle is overwritten with the signed version.
Use -o to write to a different file.

    - `sapl bundle verify` - Verify a signed policy bundle against an Ed25519 public key.

Validates the bundle's Ed25519 signature and checks SHA-256 hashes
of all files against the manifest. Reports the key ID, creation
timestamp, and number of verified files on success.

    - `sapl bundle inspect` - Show bundle contents and metadata.

Displays the signature status, PDP configuration (pdp.json), and
a list of all policies with their sizes. Useful for auditing
bundles before deployment.

    - `sapl bundle keygen` - Generate an Ed25519 keypair for bundle signing.

Creates a PKCS#8 PEM-encoded private key (<prefix>.pem) and an
X.509 PEM-encoded public key (<prefix>.pub). The private key
is used with 'sapl bundle sign' or 'sapl bundle create -k'.
The public key is configured on the PDP server to verify
bundle signatures.

  - `sapl check` - Check authorization and encode the result as a process exit code.

Evaluates a single authorization subscription against policies and exits
with a code that encodes the decision. No output is written to stdout,
making this command ideal for shell scripts and CI/CD pipelines.

The subscription can be provided via named flags (-s, -a, -r) or a JSON
file (-f). Named flag values must be valid JSON (strings must be
quoted, e.g., '"alice"'). Use -f - to read from stdin.

By default, policies are loaded from the current directory. Use --dir for
a specific directory, --bundle for a bundle file, or --remote to
query a running PDP server.

  - `sapl decide` - Subscribe to authorization decisions and stream updates as NDJSON.

Subscribes to the policy decision point and prints each decision as a
JSON line to stdout (Newline Delimited JSON). When policies change,
attributes update, or the subscription context evolves, a new
decision line is emitted automatically.

Runs until interrupted (Ctrl+C) or the decision stream completes.

The subscription can be provided via named flags (-s, -a, -r) or a JSON
file (-f). Named flag values must be valid JSON (strings must be
quoted, e.g., '"alice"'). Use -f - to read from stdin.

By default, policies are loaded from the current directory. Use --dir for
a specific directory, --bundle for a bundle file, or --remote to
query a running PDP server.

  - `sapl decide-once` - Evaluate a single authorization decision and print the result as JSON.

Evaluates the authorization subscription against policies once and prints
the full authorization decision to stdout. The output is a JSON object
containing the decision (PERMIT, DENY, NOT_APPLICABLE, INDETERMINATE),
any obligations, advice, and resource transformations.

The subscription can be provided via named flags (-s, -a, -r) or a JSON
file (-f). Named flag values must be valid JSON (strings must be
quoted, e.g., '"alice"'). Use -f - to read from stdin.

By default, policies are loaded from the current directory. Use --dir for
a specific directory, --bundle for a bundle file, or --remote to
query a running PDP server.

  - `sapl generate` - Generate authentication credentials for PDP server clients.

Creates credentials with Argon2id-encoded hashes and outputs
ready-to-use configuration snippets for application.yml.

    - `sapl generate basic` - Generate HTTP Basic Auth credentials with Argon2id-encoded password.

Creates a random username and password, encodes the password with
Argon2id, and prints the credentials along with an application.yml
configuration snippet and a curl usage example.

Store the plaintext password securely. Only the Argon2id hash goes
into server configuration.

    - `sapl generate apikey` - Generate a Bearer token API key with Argon2id-encoded hash.

Creates an API key with the format sapl_<random> and encodes it
with Argon2id. Prints the key along with an application.yml
configuration snippet and a curl usage example.

The API key is used as a Bearer token in the Authorization header.


## sapl server

Start the PDP server (default when no command is given).

Launches the SAPL Policy Decision Point as an HTTP server. Clients send
authorization subscriptions via the HTTP API and receive decisions
as JSON responses or Server-Sent Event streams.

The server is configured via application.yml. Place it in a config/
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

**Examples**

```
sapl server

  sapl server --server.port=9090

  sapl server --spring.config.location=file:/etc/sapl/application.yml

```

## sapl bundle

Policy bundle operations.

Bundles package SAPL policies and PDP configuration into a single
file for deployment. They can be cryptographically signed with
Ed25519 keys for integrity verification.


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

Packages all .sapl policy files and pdp.json from the input directory
into a .saplbundle file. Policies are validated for correct SAPL
syntax during creation.

Optionally signs the bundle during creation when a private key is
provided. This is equivalent to creating an unsigned bundle and
then running 'sapl bundle sign' separately.


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

```
sapl bundle create -i ./policies -o policies.saplbundle

  sapl bundle create -i ./policies -o policies.saplbundle -k signing.pem --key-id prod-2026

```

### sapl bundle sign

Sign a policy bundle with an Ed25519 private key.

Creates a manifest containing SHA-256 hashes of all files in the
bundle and signs it with the provided Ed25519 private key. The
signature enables the PDP server to verify bundle integrity and
authenticity at load time.

By default, the input bundle is overwritten with the signed version.
Use -o to write to a different file.


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

```
sapl bundle sign -b policies.saplbundle -k signing.pem

  sapl bundle sign -b policies.saplbundle -k signing.pem -o signed.saplbundle --key-id prod-2026

```

### sapl bundle verify

Verify a signed policy bundle against an Ed25519 public key.

Validates the bundle's Ed25519 signature and checks SHA-256 hashes
of all files against the manifest. Reports the key ID, creation
timestamp, and number of verified files on success.


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

```
sapl bundle verify -b policies.saplbundle -k signing.pub

```

### sapl bundle inspect

Show bundle contents and metadata.

Displays the signature status, PDP configuration (pdp.json), and
a list of all policies with their sizes. Useful for auditing
bundles before deployment.


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

```
sapl bundle inspect -b policies.saplbundle

```

### sapl bundle keygen

Generate an Ed25519 keypair for bundle signing.

Creates a PKCS#8 PEM-encoded private key (<prefix>.pem) and an
X.509 PEM-encoded public key (<prefix>.pub). The private key
is used with 'sapl bundle sign' or 'sapl bundle create -k'.
The public key is configured on the PDP server to verify
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

```
sapl bundle keygen -o signing-key

  sapl bundle keygen -o signing-key --force

```

## sapl check

Check authorization and encode the result as a process exit code.

Evaluates a single authorization subscription against policies and exits
with a code that encodes the decision. No output is written to stdout,
making this command ideal for shell scripts and CI/CD pipelines.

The subscription can be provided via named flags (-s, -a, -r) or a JSON
file (-f). Named flag values must be valid JSON (strings must be
quoted, e.g., '"alice"'). Use -f - to read from stdin.

By default, policies are loaded from the current directory. Use --dir for
a specific directory, --bundle for a bundle file, or --remote to
query a running PDP server.


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

| Option | Description | Default |
|--------|-------------|---------|
| `--remote` | Connect to a remote PDP server instead of evaluating locally |  |
| `--url <url>` | Remote PDP URL (default: http://localhost:8443) | `http://localhost:8443` |
| `--insecure` | Skip TLS certificate verification (development only) |  |
| `--basic-auth <basicAuth>` | HTTP Basic credentials in user:password format |  |
| `--token <token>` | Bearer token for authentication (API key or JWT) |  |
| `--dir <dir>` | Directory containing .sapl policy files and pdp.json |  |
| `--bundle <bundle>` | Policy bundle file (.saplbundle) |  |
| `--public-key <publicKey>` | Ed25519 public key file (PEM) for bundle signature verification |  |
| `--no-verify` | Skip bundle signature verification (development only) |  |
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

```
sapl check --dir ./policies -s '"alice"' -a '"read"' -r '"doc"'

  if sapl check --bundle prod.saplbundle -s '"ci"' -a '"deploy"' -r '"prod"'; then echo "Permitted"; fi

  echo '{"subject":"alice","action":"read","resource":"doc"}' | sapl check -f -

  sapl check --remote --url https://pdp.example.com --token $SAPL_TOKEN -s '"alice"' -a '"read"' -r '"doc"'

```

## sapl decide

Subscribe to authorization decisions and stream updates as NDJSON.

Subscribes to the policy decision point and prints each decision as a
JSON line to stdout (Newline Delimited JSON). When policies change,
attributes update, or the subscription context evolves, a new
decision line is emitted automatically.

Runs until interrupted (Ctrl+C) or the decision stream completes.

The subscription can be provided via named flags (-s, -a, -r) or a JSON
file (-f). Named flag values must be valid JSON (strings must be
quoted, e.g., '"alice"'). Use -f - to read from stdin.

By default, policies are loaded from the current directory. Use --dir for
a specific directory, --bundle for a bundle file, or --remote to
query a running PDP server.


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

| Option | Description | Default |
|--------|-------------|---------|
| `--remote` | Connect to a remote PDP server instead of evaluating locally |  |
| `--url <url>` | Remote PDP URL (default: http://localhost:8443) | `http://localhost:8443` |
| `--insecure` | Skip TLS certificate verification (development only) |  |
| `--basic-auth <basicAuth>` | HTTP Basic credentials in user:password format |  |
| `--token <token>` | Bearer token for authentication (API key or JWT) |  |
| `--dir <dir>` | Directory containing .sapl policy files and pdp.json |  |
| `--bundle <bundle>` | Policy bundle file (.saplbundle) |  |
| `--public-key <publicKey>` | Ed25519 public key file (PEM) for bundle signature verification |  |
| `--no-verify` | Skip bundle signature verification (development only) |  |
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

```
sapl decide --dir ./policies -s '"alice"' -a '"read"' -r '"doc"'

  sapl decide --remote --token $SAPL_TOKEN -s '"alice"' -a '"read"' -r '"doc"'

```

## sapl decide-once

Evaluate a single authorization decision and print the result as JSON.

Evaluates the authorization subscription against policies once and prints
the full authorization decision to stdout. The output is a JSON object
containing the decision (PERMIT, DENY, NOT_APPLICABLE, INDETERMINATE),
any obligations, advice, and resource transformations.

The subscription can be provided via named flags (-s, -a, -r) or a JSON
file (-f). Named flag values must be valid JSON (strings must be
quoted, e.g., '"alice"'). Use -f - to read from stdin.

By default, policies are loaded from the current directory. Use --dir for
a specific directory, --bundle for a bundle file, or --remote to
query a running PDP server.


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

| Option | Description | Default |
|--------|-------------|---------|
| `--remote` | Connect to a remote PDP server instead of evaluating locally |  |
| `--url <url>` | Remote PDP URL (default: http://localhost:8443) | `http://localhost:8443` |
| `--insecure` | Skip TLS certificate verification (development only) |  |
| `--basic-auth <basicAuth>` | HTTP Basic credentials in user:password format |  |
| `--token <token>` | Bearer token for authentication (API key or JWT) |  |
| `--dir <dir>` | Directory containing .sapl policy files and pdp.json |  |
| `--bundle <bundle>` | Policy bundle file (.saplbundle) |  |
| `--public-key <publicKey>` | Ed25519 public key file (PEM) for bundle signature verification |  |
| `--no-verify` | Skip bundle signature verification (development only) |  |
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

```
sapl decide-once --dir ./policies -s '"alice"' -a '"read"' -r '"doc"'

  sapl decide-once -f request.json --bundle policies.saplbundle

  echo '{"subject":"alice","action":"read","resource":"doc"}' | sapl decide-once -f -

  sapl decide-once --remote --token $SAPL_TOKEN -s '{"role":"admin"}' -a '"write"' -r '"config"'

```

## sapl generate

Generate authentication credentials for PDP server clients.

Creates credentials with Argon2id-encoded hashes and outputs
ready-to-use configuration snippets for application.yml.


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

Creates a random username and password, encodes the password with
Argon2id, and prints the credentials along with an application.yml
configuration snippet and a curl usage example.

Store the plaintext password securely. Only the Argon2id hash goes
into server configuration.


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

**Examples**

```
sapl generate basic

  sapl generate basic --id my-client --pdp-id production

```

### sapl generate apikey

Generate a Bearer token API key with Argon2id-encoded hash.

Creates an API key with the format sapl_<random> and encodes it
with Argon2id. Prints the key along with an application.yml
configuration snippet and a curl usage example.

The API key is used as a Bearer token in the Authorization header.


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

**Examples**

```
sapl generate apikey

  sapl generate apikey --id my-service --pdp-id production

```

