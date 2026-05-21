---
url: /developers/contentstack-delivery/dot-net-sdk/get-started-with-dotnet-delivery-sdk
marker: ".NET Delivery SDK"
heading: "Get Started with .NET Delivery SDK"
---

## Overview

The Contentstack .NET Delivery SDK allows you to fetch published content from your stack in .NET applications.

> **Note:** You need a Delivery token and stack API key before you initialize the SDK.

## Install the package

```bash
dotnet add package Contentstack.Delivery
```

## Initialize the client

```csharp
var client = new ContentstackClient(
    "YOUR_API_KEY",
    "YOUR_DELIVERY_TOKEN",
    "YOUR_ENVIRONMENT");
```

## Next steps

- Configure [environment-specific settings](/developers/contentstack-delivery/dot-net-sdk/get-started-with-dotnet-delivery-sdk) in your app.
- See the [Content Management API](/developers/apis/content-management-api) for creating entries programmatically.
