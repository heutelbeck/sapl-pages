---
layout: default
title: Command Line
parent: SAPL Node
nav_order: 709
---

# Command Line

SAPL Node PDP server and policy CLI.

## Commands

- [`sapl`](#sapl) -- SAPL Node PDP server and policy CLI.
  - [`sapl server`](#sapl-server) -- Start the PDP server (default when no subcommand is given).
  - [`sapl bundle`](#sapl-bundle) -- Manage policy bundles for deployment.
    - [`sapl bundle create`](#sapl-bundle-create) -- Create a policy bundle from a directory.
    - [`sapl bundle unpack`](#sapl-bundle-unpack) -- Unpack a policy bundle into a directory.
    - [`sapl bundle seal`](#sapl-bundle-seal) -- Seal a policy directory's secrets to a recipient.
    - [`sapl bundle unseal`](#sapl-bundle-unseal) -- Unseal a policy directory's secrets with the recipient key.
    - [`sapl bundle sign`](#sapl-bundle-sign) -- Sign a policy bundle with an Ed25519 private key.
    - [`sapl bundle verify`](#sapl-bundle-verify) -- Verify a signed policy bundle against an Ed25519 public key.
    - [`sapl bundle inspect`](#sapl-bundle-inspect) -- Show bundle contents and metadata.
    - [`sapl bundle keygen`](#sapl-bundle-keygen) -- Generate an Ed25519 keypair for bundle signing.
    - [`sapl bundle keygen-secrets`](#sapl-bundle-keygen-secrets) -- Generate an X25519 keypair for sealing bundle secrets.
  - [`sapl check`](#sapl-check) -- Evaluate authorization and exit with a decision code.
  - [`sapl decide`](#sapl-decide) -- Stream authorization decisions as NDJSON.
  - [`sapl decide-once`](#sapl-decide-once) -- Evaluate a single authorization decision and print the result as JSON.
  - [`sapl generate`](#sapl-generate) -- Generate authentication credentials for PDP server clients.
    - [`sapl generate basic`](#sapl-generate-basic) -- Generate HTTP Basic Auth credentials with Argon2id-encoded password.
    - [`sapl generate apikey`](#sapl-generate-apikey) -- Generate a Bearer token API key with Argon2id-encoded hash.
  - [`sapl test`](#sapl-test) -- Run SAPL tests and generate coverage reports.
  - [`sapl benchmark`](#sapl-benchmark) -- Benchmark embedded PDP evaluation performance.
  - [`sapl loadtest`](#sapl-loadtest) -- Load test a running SAPL PDP server.

## sapl server

Start the PDP server (default when no subcommand is given).

Launches the SAPL Policy Decision Point as an HTTP server. Clients
send authorization subscriptions via the HTTP API and receive
decisions as JSON responses or Server-Sent Event streams.

A high-performance RSocket endpoint with protobuf serialization is
enabled by default on port 7000 for lower-latency authorization.
Disable it explicitly with --sapl.pdp.rsocket.enabled=false when
only the HTTP transport is needed.

The server is configured via `application.yml`. Place it in a config/
subdirectory of the working directory, or specify a custom location
with --spring.config.location=file:/path/to/application.yml.

Any Spring Boot property can be overridden on the command line:
  --server.port=9090
  --sapl.pdp.rsocket.enabled=false
  --sapl.pdp.rsocket.port=7000

Shortcut for local development:
  `--no-auth`   accept unauthenticated requests
              (alias for --io.sapl.node.allow-no-auth=true)

Key configuration areas: policy source type (DIRECTORY, BUNDLES),
authentication (no-auth, basic, API key, OAuth2), TLS, RSocket,
and observability (health endpoints, Prometheus metrics).


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

# Local development without authentication
sapl server --no-auth

# Start on a custom port
sapl server --server.port=9090

# Use a custom configuration file
sapl server --spring.config.location=file:/etc/sapl/application.yml
```

See Also: [sapl generate basic](#sapl-generate-basic), [sapl generate apikey](#sapl-generate-apikey)

## sapl bundle

Manage policy bundles for deployment.

Bundles package SAPL policies, PDP configuration, secrets, and
extension data into a single `.saplbundle` file. They can be
cryptographically signed with Ed25519 keys for integrity
verification at load time, and their secrets can be sealed to an
X25519 recipient so no cleartext credentials travel with the
bundle.

A secrets file carries its sealing state in its name: secrets.json
and ext-<name>-secrets.json are cleartext, secrets.sealed.json and
ext-<name>-secrets.sealed.json are sealed. A bundle or directory
never mixes both states.

The commands compose into a full maintenance loop:
keygen / keygen-secrets, then seal, create, verify, inspect, and
for editing an existing bundle: unpack, unseal, edit, seal,
create, sign.

Key option convention: `-k` always takes an Ed25519 signing or
verification key (PEM). Sealing keys are X25519 JWKs and always
use `--seal-to` (public key) or `--unseal-with` (private key).


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
correct SAPL syntax during creation. Extension data
(ext-<name>.json), extension secrets, PDP-level secrets, and
critical-extensions.json are packaged too.

Secrets are handled by file name. A plaintext folder
(secrets.json, ext-<name>-secrets.json) requires `--seal-to`: the
files are sealed to the given X25519 recipient public key and
written as secrets.sealed.json and
ext-<name>-secrets.sealed.json. A pre-sealed folder (only
*.sealed.json secrets, for example from 'sapl bundle seal' or a
verbatim unpack) is bundled as-is and needs no key, and
`--seal-to` is rejected. A folder that mixes plaintext and sealed
secrets is rejected. Plaintext secrets are never written into a
bundle. Generate the recipient keypair with
'sapl bundle keygen-secrets'.

Every bundle carries a .sapl-manifest.json recording the
configurationId of the publication. Set it explicitly with
`--configuration-id`, or a content-derived id of the form
bundle@<hash16> is recorded. The resulting configuration id is
printed on success for CI or agent capture.

Optionally signs the bundle when a private key is provided.
This is equivalent to creating then running 'sapl bundle sign'.


**Synopsis**

```
sapl bundle create [-hV] [--force]
                          [--configuration-id=<configurationId>] -i=<inputDir>
                          [-k=<keyFile>] [--key-id=<keyId>] -o=<outputFile>
                          [--seal-to=<sealToFile>]
```

**Options**

| Option | Description | Default |
|--------|-------------|---------|
| `-i, --input <inputDir>` | Input directory containing policies |  |
| `--configuration-id <configurationId>` | Configuration id recorded in the bundle manifest (defaults to a content-derived id) |  |
| `-k, --key <keyFile>` | Ed25519 private key file (PEM format) for signing |  |
| `--key-id <keyId>` | Key identifier for rotation support | `default` |
| `-o, --output <outputFile>` | Output bundle file path |  |
| `--seal-to <sealToFile>` | X25519 recipient public key (JWK file) that plaintext secrets are sealed to |  |
| `--force` | Overwrite an existing output file |  |
| `-h, --help` | Show this help message and exit. |  |
| `-V, --version` | Print version information and exit. |  |

**Exit Codes**

| Code | Description |
|------|-------------|
| 0 | Bundle created successfully |
| 1 | Error (invalid input, no policies found, mixed or unsealed secrets, or I/O error) |

**Examples**

```shell
# Create an unsigned bundle
sapl bundle create -i ./policies -o policies.saplbundle

# Create and sign in one step
sapl bundle create -i ./policies -o policies.saplbundle -k signing.pem --key-id prod-2026

# Create a bundle, sealing plaintext secrets to a recipient
sapl bundle create -i ./policies -o policies.saplbundle --seal-to recipient.pub.jwk

# Create from a pre-sealed folder (no key needed)
sapl bundle create -i ./sealed-policies -o policies.saplbundle
```

See Also: [sapl bundle sign](#sapl-bundle-sign), [sapl bundle seal](#sapl-bundle-seal), [sapl bundle unpack](#sapl-bundle-unpack), [sapl bundle keygen secrets](#sapl-bundle-keygen-secrets)

### sapl bundle unpack

Unpack a policy bundle into a directory.

Extracts every file from a `.saplbundle` into the output directory:
`pdp.json`, `.sapl` policies, secrets files, extension files, and
critical-extensions.json. The manifest is not written, so the
directory can be edited and repackaged with 'sapl bundle create'.
The manifest's configuration id is printed; the unpacked sources
carry none.

With `-k` the signature is verified before unpacking and a mismatch
aborts. With `--unseal-with`, secrets.sealed.json and every
ext-<name>-secrets.sealed.json are unsealed with the X25519
recipient private key and written under their plaintext names
(secrets.json, ext-<name>-secrets.json), producing a valid
plaintext directory. Without it, sealed files are written
verbatim, which allows repackaging without the key.


**Synopsis**

```
sapl bundle unpack [-hV] [--force] -b=<bundleFile> [-k=<keyFile>]
                          -o=<outputDir> [--unseal-with=<unsealKeyFile>]
```

**Options**

| Option | Description | Default |
|--------|-------------|---------|
| `-b, --bundle <bundleFile>` | Bundle file to unpack |  |
| `-o, --output <outputDir>` | Output directory |  |
| `-k, --key <keyFile>` | Ed25519 public key (PEM) to verify the signature before unpacking |  |
| `--unseal-with <unsealKeyFile>` | X25519 recipient private key (JWK) to unseal secrets to cleartext |  |
| `--force` | Overwrite existing files in the output directory |  |
| `-h, --help` | Show this help message and exit. |  |
| `-V, --version` | Print version information and exit. |  |

**Exit Codes**

| Code | Description |
|------|-------------|
| 0 | Bundle unpacked successfully |
| 1 | Error (bundle or key not found, verification failed, or I/O error) |

**Examples**

```shell
# Unpack verbatim (sealed secrets stay sealed)
sapl bundle unpack -b policies.saplbundle -o ./policies

# Verify then unpack
sapl bundle unpack -b policies.saplbundle -o ./policies -k signing.pub

# Unpack and unseal secrets to cleartext
sapl bundle unpack -b policies.saplbundle -o ./policies --unseal-with recipient.jwk
```

See Also: [sapl bundle create](#sapl-bundle-create), [sapl bundle seal](#sapl-bundle-seal), [sapl bundle unseal](#sapl-bundle-unseal), [sapl bundle verify](#sapl-bundle-verify)

### sapl bundle seal

Seal a policy directory's secrets to a recipient.

Seals every plaintext secrets file in the directory to the given
X25519 recipient public key: secrets.json becomes
secrets.sealed.json and each ext-<name>-secrets.json becomes
ext-<name>-secrets.sealed.json. The plaintext files are deleted, so
the directory holds no cleartext secrets afterwards.


**Synopsis**

```
sapl bundle seal [-hV] -i=<inputDir> --seal-to=<recipientFile>
```

**Options**

| Option | Description | Default |
|--------|-------------|---------|
| `-i, --input <inputDir>` | Directory whose secrets are sealed |  |
| `--seal-to <recipientFile>` | X25519 recipient public key (JWK file) |  |
| `-h, --help` | Show this help message and exit. |  |
| `-V, --version` | Print version information and exit. |  |

**Exit Codes**

| Code | Description |
|------|-------------|
| 0 | Secrets sealed (or none found) |
| 1 | Error (directory or key not found, sealed target exists, or I/O error) |

**Examples**

```shell
sapl bundle seal -i ./policies --seal-to recipient.pub.jwk
```

See Also: [sapl bundle unseal](#sapl-bundle-unseal), [sapl bundle keygen secrets](#sapl-bundle-keygen-secrets)

### sapl bundle unseal

Unseal a policy directory's secrets with the recipient key.

Unseals every sealed secrets file in the directory with the given
X25519 recipient private key: secrets.sealed.json becomes
secrets.json and each ext-<name>-secrets.sealed.json becomes
ext-<name>-secrets.json. The sealed files are deleted. The
resulting plaintext directory can be edited and resealed with
'sapl bundle seal'.


**Synopsis**

```
sapl bundle unseal [-hV] -i=<inputDir> --unseal-with=<recipientFile>
```

**Options**

| Option | Description | Default |
|--------|-------------|---------|
| `-i, --input <inputDir>` | Directory whose secrets are unsealed |  |
| `--unseal-with <recipientFile>` | X25519 recipient private key (JWK file) |  |
| `-h, --help` | Show this help message and exit. |  |
| `-V, --version` | Print version information and exit. |  |

**Exit Codes**

| Code | Description |
|------|-------------|
| 0 | Secrets unsealed (or none found) |
| 1 | Error (directory or key not found, plaintext target exists, or I/O error) |

**Examples**

```shell
sapl bundle unseal -i ./policies --unseal-with recipient.jwk
```

See Also: [sapl bundle seal](#sapl-bundle-seal), [sapl bundle keygen secrets](#sapl-bundle-keygen-secrets)

### sapl bundle sign

Sign a policy bundle with an Ed25519 private key.

Creates a manifest containing SHA-256 hashes of all files in
the bundle and signs it with the provided Ed25519 private key.
All files are preserved: `pdp.json`, policies, sealed secrets,
extension files, and critical-extensions.json. The signature
enables the PDP server to verify bundle integrity and
authenticity at load time.

A bundle containing plaintext secrets is refused. Unpack it,
seal the directory, and re-create it before signing.

When the input bundle carries a manifest, its configurationId,
attribution, and audience are carried over into the signed
bundle; the creation timestamp and engine version are re-minted
because re-signing is a build event.

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
| 1 | Error (bundle or key not found, plaintext secrets, or signing failed) |

**Examples**

```shell
# Sign a bundle (overwrites the original)
sapl bundle sign -b policies.saplbundle -k signing.pem

# Sign and write to a new file
sapl bundle sign -b policies.saplbundle -k signing.pem -o signed.saplbundle --key-id prod-2026
```

See Also: [sapl bundle keygen](#sapl-bundle-keygen), [sapl bundle verify](#sapl-bundle-verify), [sapl bundle seal](#sapl-bundle-seal)

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

Displays the signature status, the manifest metadata
(configuration id and attribution), PDP configuration
(pdp.json), all policies with their sizes, the secrets files
with their sealing state, and the extensions with their
payloads and critical markers. Secret values are never
printed, only file names and sizes. Useful for auditing
bundles before deployment.

The Integrity line is always explicit. With `-k` the signature
and all file hashes are checked and reported as VERIFIED or
FAILED, and a failure also sets the exit code. Without `-k` the
line reads NOT CHECKED, so an unverified bundle can never be
mistaken for a verified one.


**Synopsis**

```
sapl bundle inspect [-hV] -b=<bundleFile> [-k=<keyFile>]
```

**Options**

| Option | Description | Default |
|--------|-------------|---------|
| `-b, --bundle <bundleFile>` | Bundle file to inspect |  |
| `-k, --key <keyFile>` | Ed25519 public key (PEM) to verify the signature and file hashes |  |
| `-h, --help` | Show this help message and exit. |  |
| `-V, --version` | Print version information and exit. |  |

**Exit Codes**

| Code | Description |
|------|-------------|
| 0 | Inspection completed (and integrity verified, when -k was given) |
| 1 | Error reading bundle, or integrity check failed |

**Examples**

```shell
# Show bundle contents and signature status
sapl bundle inspect -b policies.saplbundle

# Inspect and verify integrity in one step
sapl bundle inspect -b policies.saplbundle -k signing.pub
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

### sapl bundle keygen-secrets

Generate an X25519 keypair for sealing bundle secrets.

Generates an X25519 recipient keypair as JWK files: <prefix>.jwk
(private) and <prefix>.pub.jwk (public). Seal secrets to the
public key with 'sapl bundle seal `--seal-to` <prefix>.pub.jwk' or
'sapl bundle create `--seal-to` <prefix>.pub.jwk'. The PDP unseals
them with the matching private key. Keep the private key secret
and distribute it only to the recipient (or cluster).


**Synopsis**

```
sapl bundle keygen-secrets [-hV] [--force] -o=<outputPrefix>
```

**Options**

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <outputPrefix>` | Output file prefix (creates <prefix>.jwk and <prefix>.pub.jwk) |  |
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
sapl bundle keygen-secrets -o recipient
sapl bundle create -i ./policies -o policies.saplbundle --seal-to recipient.pub.jwk
```

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
                  [--rsocket] [--url=<url>] [--host=<rsocketHost>]
                  [--port=<rsocketPort>] [--rsocket-tls] [--insecure]
                  [--basic-auth=<basicAuth> | --token=<token>]] [--dir=<dir> |
                  --bundle=<bundle>] [--public-key=<publicKey> | --no-verify]
                  [-f=<file> | [-s=<subject> -a=<action> -r=<resource>
                  [-e=<environment>] [--secrets=<secrets>]]]
```

**Options**


*Remote Connection:*

| Option | Description | Default |
|--------|-------------|---------|
| `--remote` | Connect to a remote PDP server instead of evaluating locally |  |
| `--rsocket` | Use RSocket/protobuf transport instead of HTTP/JSON |  |
| `--url <url>` | Remote PDP URL for HTTP (default: http://localhost:8080, env: SAPL_URL) |  |
| `--host <rsocketHost>` | RSocket host (default: localhost) | `localhost` |
| `--port <rsocketPort>` | RSocket port (default: 7000) | `7000` |
| `--rsocket-tls` | Enable TLS for the RSocket transport (use with --rsocket) |  |
| `--insecure` | Accept insecure transport (skip TLS certificate verification and allow credentials over plaintext). Development only |  |
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
| 5 | SUSPEND |

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
decision line is emitted automatically. Each decision is one compact
line; `--pretty` indents them for reading but breaks the NDJSON format.

Runs until interrupted (Ctrl+C) or the decision stream completes.

By default, policies are loaded from ~/.sapl/. Use
`--dir` for a different directory, `--bundle` for a bundle file, or
`--remote` to query a running PDP server.


**Synopsis**

```
sapl decide [-hV] [--json-report] [--pretty] [--text-report] [--trace]
                   [--remote [--rsocket] [--url=<url>] [--host=<rsocketHost>]
                   [--port=<rsocketPort>] [--rsocket-tls] [--insecure]
                   [--basic-auth=<basicAuth> | --token=<token>]] [--dir=<dir> |
                   --bundle=<bundle>] [--public-key=<publicKey> | --no-verify]
                   [-f=<file> | [-s=<subject> -a=<action> -r=<resource>
                   [-e=<environment>] [--secrets=<secrets>]]]
```

**Options**


*Remote Connection:*

| Option | Description | Default |
|--------|-------------|---------|
| `--remote` | Connect to a remote PDP server instead of evaluating locally |  |
| `--rsocket` | Use RSocket/protobuf transport instead of HTTP/JSON |  |
| `--url <url>` | Remote PDP URL for HTTP (default: http://localhost:8080, env: SAPL_URL) |  |
| `--host <rsocketHost>` | RSocket host (default: localhost) | `localhost` |
| `--port <rsocketPort>` | RSocket port (default: 7000) | `7000` |
| `--rsocket-tls` | Enable TLS for the RSocket transport (use with --rsocket) |  |
| `--insecure` | Accept insecure transport (skip TLS certificate verification and allow credentials over plaintext). Development only |  |
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
| `--pretty` | Indent each decision for readability. This breaks the NDJSON one-decision-per-line format. |  |
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
decision (PERMIT, DENY, SUSPEND, NOT_APPLICABLE, INDETERMINATE), any
obligations, advice, and resource transformations. The JSON is compact
by default; pass `--pretty` for an indented, human-readable form.

By default, policies are loaded from ~/.sapl/. Use
`--dir` for a different directory, `--bundle` for a bundle file, or
`--remote` to query a running PDP server.


**Synopsis**

```
sapl decide-once [-hV] [--json-report] [--pretty] [--text-report]
                        [--trace] [--remote [--rsocket] [--url=<url>]
                        [--host=<rsocketHost>] [--port=<rsocketPort>]
                        [--rsocket-tls] [--insecure] [--basic-auth=<basicAuth>
                        | --token=<token>]] [--dir=<dir> | --bundle=<bundle>]
                        [--public-key=<publicKey> | --no-verify] [-f=<file> |
                        [-s=<subject> -a=<action> -r=<resource>
                        [-e=<environment>] [--secrets=<secrets>]]]
```

**Options**


*Remote Connection:*

| Option | Description | Default |
|--------|-------------|---------|
| `--remote` | Connect to a remote PDP server instead of evaluating locally |  |
| `--rsocket` | Use RSocket/protobuf transport instead of HTTP/JSON |  |
| `--url <url>` | Remote PDP URL for HTTP (default: http://localhost:8080, env: SAPL_URL) |  |
| `--host <rsocketHost>` | RSocket host (default: localhost) | `localhost` |
| `--port <rsocketPort>` | RSocket port (default: 7000) | `7000` |
| `--rsocket-tls` | Enable TLS for the RSocket transport (use with --rsocket) |  |
| `--insecure` | Accept insecure transport (skip TLS certificate verification and allow credentials over plaintext). Development only |  |
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
| `--pretty` | Indent the decision JSON for readability instead of compact single-line output. |  |
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
`application.yml` configuration snippet and ready-to-paste curl
usage examples for the common shells (bash and PowerShell).

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
sapl generate basic --id service-a --pdp-id production
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

## sapl benchmark

Benchmark embedded PDP evaluation performance.

Quick assessment of policy evaluation throughput and latency for
an embedded PDP using a built-in timing harness.

Use `--rbac` for a self-contained benchmark without policy files,
or provide a policy directory (--dir) or bundle (--bundle).

When `--output` is specified, produces Markdown and CSV reports
with timestamped filenames.

For rigorous benchmarks with proper JIT isolation,
use the sapl-benchmark-sapl4 module instead.

For remote server load testing (HTTP or RSocket), use
'sapl loadtest' instead.


**Synopsis**

```
sapl benchmark [-hV] [--latency] [--machine-readable] [--rbac]
                      [-b=<benchmark>]
                      [--measurement-iterations=<measurementIterations>]
                      [--measurement-time=<measurementTimeSeconds>]
                      [-o=<output>] [--output-prefix=<outputPrefix>]
                      [-t=<threads>] [--warmup-iterations=<warmupIterations>]
                      [--warmup-time=<warmupTimeSeconds>] [--dir=<dir> |
                      --bundle=<bundle>] [--public-key=<publicKey> |
                      --no-verify] [-f=<file> | [-s=<subject> -a=<action>
                      -r=<resource> [-e=<environment>] [--secrets=<secrets>]]]
```

**Options**


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
| `--rbac` | Use built-in RBAC benchmark (no policy files or subscription needed). |  |
| `--warmup-iterations <warmupIterations>` | Number of warmup iterations before measurement | `3` |
| `--warmup-time <warmupTimeSeconds>` | Duration of each warmup iteration in seconds | `45` |
| `--measurement-iterations <measurementIterations>` | Number of measurement iterations | `5` |
| `--measurement-time <measurementTimeSeconds>` | Duration of each measurement iteration in seconds | `45` |
| `-t, --threads <threads>` | Number of concurrent benchmark threads | `1` |
| `-b, --benchmark <benchmark>` | Benchmark method to run (decideOnceBlocking, decideStreamFirst, noOp) | `decideOnceBlocking` |
| `--latency` | Run a separate latency measurement pass after throughput | `true` |
| `-o, --output <output>` | Output directory for benchmark results (JSON, Markdown, CSV) |  |
| `--machine-readable` | Output single-line parseable results for script integration | `false` |
| `--output-prefix <outputPrefix>` | Filename prefix for output files (e.g., scenario_indexing) |  |
| `-h, --help` | Show this help message and exit. |  |
| `-V, --version` | Print version information and exit. |  |

**Exit Codes**

| Code | Description |
|------|-------------|
| 0 | Benchmark completed successfully |
| 1 | Error during benchmark |

**Examples**

```shell
# Built-in RBAC benchmark (no files needed)
sapl benchmark --rbac -o ./results

# Quick benchmark with local policies
sapl benchmark --dir ./policies -s '"alice"' -a '"read"' -r '"doc"'

# Multi-threaded benchmark with config file
sapl benchmark --rbac -c configs/standard.json -o ./results
```

See Also: [sapl loadtest](#sapl-loadtest), [sapl check](#sapl-check), [sapl decide once](#sapl-decide-once)

## sapl loadtest

Load test a running SAPL PDP server.

Measures server throughput and per-request latency distribution
under controlled concurrency. Supports saturation mode (as fast
as possible) and paced mode (--rate) with coordinated omission
correction for accurate latency measurement under controlled load.

Both HTTP and RSocket modes use reactive request pipelines and
pre-serialize the request payload to eliminate client-side
overhead from the measurement.

For embedded PDP benchmarking, use 'sapl benchmark' instead.


**Synopsis**

```
sapl loadtest [-hV] [--insecure] [--machine-readable] [--rsocket]
                     [--concurrency=<concurrency>]
                     [--connections=<connections>] [--host=<rsocketHost>]
                     [--label=<label>] [--measurement-seconds=<measureSeconds>]
                     [-o=<output>] [--port=<rsocketPort>] [--rate=<rate>]
                     [--socket-path=<socketPath>] [--url=<url>]
                     [--vt-per-connection=<vtPerConnection>]
                     [--warmup-seconds=<warmupSeconds>] [-f=<file> |
                     [-s=<subject> -a=<action> -r=<resource> [-e=<environment>]
                     [--secrets=<secrets>]]]
```

**Options**


*Subscription Input:*

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --file <file>` | Read authorization subscription from a JSON file. Use - for stdin. |  |
| `-s, --subject <subject>` | Subject as a JSON value (string, number, object, or array) |  |
| `-a, --action <action>` | Action as a JSON value (string, number, object, or array) |  |
| `-r, --resource <resource>` | Resource as a JSON value (string, number, object, or array) |  |
| `-e, --environment <environment>` | Environment as a JSON value (optional context for policy evaluation) |  |
| `--secrets <secrets>` | Secrets as a JSON object (available to policies via the secrets() function) |  |
| `--url <url>` | HTTP server URL (default: http://localhost:8080) | `http://localhost:8080` |
| `--rsocket` | Use RSocket/protobuf transport instead of HTTP |  |
| `--host <rsocketHost>` | RSocket server host (default: localhost) | `localhost` |
| `--port <rsocketPort>` | RSocket server port (default: 7000) | `7000` |
| `--socket-path <socketPath>` | Unix domain socket path for RSocket (alternative to host/port) |  |
| `--insecure` | Skip TLS certificate verification (development only) |  |
| `--concurrency <concurrency>` | Concurrent in-flight requests for HTTP (default: 64) | `64` |
| `--connections <connections>` | Number of TCP connections for RSocket (default: 8) | `8` |
| `--vt-per-connection <vtPerConnection>` | Virtual threads per RSocket connection (default: 512) | `512` |
| `--rate <rate>` | Target request rate in req/s (0 = saturation, default: 0) | `0` |
| `--warmup-seconds <warmupSeconds>` | Warmup duration in seconds (default: 5) | `5` |
| `--measurement-seconds <measureSeconds>` | Measurement duration in seconds (default: 10) | `10` |
| `-o, --output <output>` | Output directory for results (Markdown, CSV) |  |
| `--label <label>` | Label for the report (e.g., 'Server pinned to CPUs 0-7') |  |
| `--machine-readable` | Output single-line parseable results for script integration | `false` |
| `-h, --help` | Show this help message and exit. |  |
| `-V, --version` | Print version information and exit. |  |

**Exit Codes**

| Code | Description |
|------|-------------|
| 0 | Load test completed successfully |
| 1 | Error during load test |

**Examples**

```shell
# HTTP load test against a running server
sapl loadtest --url http://localhost:8080 -s '{"role":"admin"}' -a '"read"' -r '"doc"'

# RSocket load test
sapl loadtest --rsocket --host localhost --port 7000 -s '{"role":"admin"}' -a '"read"' -r '"doc"'

# With custom concurrency and output
sapl loadtest --url http://localhost:8080 --concurrency 128 --measurement-seconds 30 -o ./results -s '"alice"' -a '"read"' -r '"doc"'

# RSocket with connection tuning
sapl loadtest --rsocket --connections 8 --vt-per-connection 512 -s '"alice"' -a '"read"' -r '"doc"'
```

See Also: [sapl benchmark](#sapl-benchmark)

