---
heading: "Contentstack .NET Model Generator"
url: /developers/sdks/content-delivery-sdk/dot-net/contentstack-dot-net-model-generator
marker: ".NET Delivery SDK"
description: Use the Contentstack .NET Model Generator to create C# model classes from content types in your stack.
product: Contentstack
doc_type: sdk-tooling
audience:
  - developers
version: .NET 7.0+
last_updated: 2026-03-25
---

# [.NET] - Contentstack .NET Model Generator

This page tell you how to install and use the Contentstack .NET Model Generator to generate C# model classes from Contentstack content types, including supported authentication methods (Authtoken and OAuth 2.0). It is intended for .NET developers who want to automate model generation for their Contentstack stacks.

## Contentstack .NET Model Generator

Use the Contentstack .NET Model Generator to create C# model classes from content types in your [stack](/docs/developers/set-up-stack/about-stack).

**Note:** Ensure .NET version **7.0 or later** is installed before executing the commands.

## Installation

To install Contentstack model generator, run following command:

```
dotnet tool install —-global contentstack.model.generator
```

## Usage

Once you install `contentstack.model.generator` run the following command to view available commands:

```
Contentstack.model.generator --help
```

## Authentication Methods

The Contentstack Model Generator supports two authentication methods:
- Authentication using Authtoken (default)
- Authentication using OAuth 2.0

## Authentication using Authtoken

### Authentication Options

| Short key | Long Key | Description |
|---|---|---|
| -a | --api-key | The stack API key for the [Content Management API](/docs/developers/apis/content-management-api). This key is required for both traditional (Authtoken-based) and OAuth 2.0 authentication methods. |
| -A | --authtoken | Specifies the authtoken used for traditional API key authentication with the Content Management API. |
| -b | --branch | Specifies a branch of the stack to fetch content types and generate models. |
| -e | --endpoint | The Contentstack host for the Content Management API. The default value used is `api.contentstack.io.` |

**Note:** OAuth 2.0–related flags (such as `--oauth`, `--client-id`, `--client-secret`, etc.) are listed separately in the OAuth 2.0 options table.

### Model Generation Options

| Short key | Long Key | Description |
|---|---|---|
| -n | --namespace | Specifies the C# namespace to use for generated model classes. |
|  |  | **Example:** `MyProject.Models` |
|  |  | **Default value: **`ContentstackModels.` |
| -N | --is-nullable | Enables nullable reference types to help prevent `System.NullReferenceException` errors. Disable if it disrupts your workflow. |
| -f | --force | Overwrites existing model files without confirmation prompts. |
| -m | --modular-block-prefix | Adds a custom prefix to class names generated for Modular Block fields. Helps differentiate similar block names across content types. |
| -g | --group-prefix | Adds a **custom prefix** to class names generated for **Group** fields. Prevents name collisions when multiple groups share identical names. |
| -p | --path | Specifies the **output directory** where model files should be created. Defaults to the **current working directory** if not specified. |

### Examples for Traditional API Key Authentication

**Example 1: Basic Usage**

To create classes in current directory run the following command:

```
contentstack.model.generator -a  -A
```

**Example 2: Specific Path**

To create classes in specific path run the following command:

```
contentstack.model.generator -a  -A  -p /User/xxx/Desktop
```

**Example 3: With Namespace**

To create classes with namespace run the following command:

```
contentstack.model.generator -a  -A  -n YourProject.Models
```

**Example 4: With Nullable Annotations**

To allow nullable annotation context in model creation run the following command:

```
contentstack.model.generator -a  -A  -N
```

**Note:** Running multiple commands in succession overwrites the previously generated files if they share the same output path. Use unique directories or enable the `--force` flag when you intend to replace existing files.

## Authentication Using OAuth 2.0

### OAuth 2.0 Commands

| Long Key | Description |
|---|---|
| --oauth | Enables OAuth 2.0 authentication for the tool. This option cannot be used together with traditional (Authtoken–based) authentication. |
| --client-id | Specifies the OAuth Client ID used for authentication. Use the default ID unless you're using a custom OAuth application. |
|  | **Default value**: `Ie0FEfTzlfAHL4xM` |
| --client-secret | Specifies the OAuth Client Secret. Optional for public clients using PKCE |
| --redirect-uri | Specifies the Redirect URI. |
|  | **Default value:**` http://localhost:8184` |
| --app-id | Specifies the default OAuth Application ID for authentication. Provide a custom App ID if using a different OAuth application. |
|  | **Default value:** `6400aa06db64de001a31c8a9` |
| --scopes | Defines one or more OAuth scopes for the authentication request. Scopes determine the level of access granted. Use space-separated values when specifying multiple scopes. |

### OAuth 2.0 Setup

#### Prerequisites
- [Contentstack account](/docs/get-started/set-up-your-account) with OAuth enabled.
- [Create an OAuth application](https://www.contentstack.com/docs/developers/developer-hub/contentstack-oauth) in your Contentstack dashboard

#### OAuth Flow
- **Authorization**: The tool displays the Contentstack OAuth authorization URL for you to open manually
- **Authentication**: Open the URL in your browser, log in to your Contentstack account and authorize the application
- **Callback**: You'll be redirected to your specified redirect URI with an authorization code
- **Code Entry**: Copy the authorization code from the redirect URL and paste it into the tool
- **Token Exchange**: The tool automatically exchanges the code for an access token
- **Model Generation**: The tool fetches your content types and generates models
- **Logout**: The tool automatically logs out and clears tokens

**Note: **Auto-logout after model generation cannot be disabled. Tokens are session-specific and not reused by other SDKs or applications.

### Examples for OAuth 2.0 Authentication

**Example 1: OAuth with PKCE (Recommended)**

For public clients or enhanced security, use OAuth with PKCE:

```
contentstack.model.generator --oauth -a  --client-id  --redirect-uri http://localhost:8184
```

**Example 2: OAuth with Client Secret**

For confidential clients with client secret:

```
contentstack.model.generator --oauth -a  --client-id  --client-secret  --redirect-uri http://localhost:8184
```

**Example 3: OAuth with App ID**

For OAuth with specific app and scopes:

```
contentstack.model.generator --oauth -a  --client-id  --redirect-uri http://localhost:8184 --app-id
```

**Example 4: OAuth with Custom Path and Namespace**

```
contentstack.model.generator --oauth -a  --client-id  --redirect-uri http://localhost:8184 -p /path/to/models -n YourProject.Models
```

### OAuth Command Example

Here's what you will see when running an OAuth command:

```
$ contentstack.model.generator --oauth -a  --client-id myclient123 --redirect-uri http://localhost:8184

Contentstack Model Generator v0.4.6
=====================================

OAuth Authentication Required
=============================

Please open the following URL in your browser to authorize the application:

https://app.contentstack.com/#!/apps/6400aa06db64de001a31c8a9/authorize?response_type=code&client_id=myclient123&redirect_uri=http%3A%2F%2Flocalhost%3A8184&code_challenge=...

After authorization, you will be redirected to a local URL.
Please copy the 'code' parameter from the redirect URL and paste it here:

Authorization code: [User pastes the code here]

Exchanging authorization code for access token...
OAuth authentication successful!
Access token expires at: 2024-01-15 14:30:00 UTC

Fetching stack information...
Stack: My Contentstack Stack
API Key: api_key

Fetching content types...
Found 5 content types:
Generating files from content type

Files successfully created!
Opening /Models

Logging out from OAuth...
OAuth logout successful!
```

## Security and Troubleshooting

### Security Features
- **PKCE Support**: Uses Proof Key for Code Exchange for enhanced security
- **Client Secret Optional**: Supports both confidential and public clients
- **Automatic Token Management**: Handles token refresh and expiration
- **Secure Logout**: Automatically clears tokens after model generation

### Troubleshooting OAuth
- **Invalid Redirect URI**: Ensure the redirect URI matches exactly what's configured in your OAuth app
- **Client ID/Secret Issues**: Verify your OAuth app credentials
- **Network Issues**: Check your internet connection and Contentstack service status
- **Permission Issues**: Ensure your account has the necessary permissions for the stack

## MIT License

Copyright (c) 2012-2025 Contentstack

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Common questions

**Q: What .NET version is required to run the Contentstack .NET Model Generator?**  
A: Ensure .NET version **7.0 or later** is installed before executing the commands.

**Q: What authentication methods does the Contentstack Model Generator support?**  
A: The Contentstack Model Generator supports two authentication methods: Authentication using Authtoken (default) and Authentication using OAuth 2.0.

**Q: How do I see all available commands for the tool?**  
A: Run: `Contentstack.model.generator --help`

**Q: How can I prevent prompts when overwriting existing model files?**  
A: Use the `--force` flag to overwrite existing model files without confirmation prompts.
