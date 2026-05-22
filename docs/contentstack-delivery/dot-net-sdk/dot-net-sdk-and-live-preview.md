---
heading: Get Started with .NET SDK and Live Preview"
description: Get started guide for using the Contentstack .NET SDK with Live Preview, including installation, stack initialization, HTTP pipeline configuration, SSR setup, and basic queries.
url: /developers/sdks/content-delivery-sdk/dot-net/get-started-with-dot-net-sdk-and-live-preview
product: Contentstack
doc_type: sdk-guide
audience:
  - developers
  - dotnet-developers
version: v2
last_updated: 2026-03-25
marker: dot-net-sdk
---

This page explains how to install and set up the Contentstack .NET SDK with Live Preview, including configuration for HTTP request pipelines and server-side rendered (SSR) websites. It is intended for developers integrating Contentstack content delivery into .NET applications and should be used when enabling Live Preview and querying content via the SDK.

## Get Started with .NET SDK and Live Preview

This guide helps you get started with [Contentstack .NET SDK](/docs/developers/sdks/content-delivery-sdk/dot-net/about-dot-net-delivery-sdk/) to build apps powered by Contentstack.

## Prerequisites
- .NET version 2.0 or later
- [Live Preview Utils SDK](/docs/developers/javascript-browser/about-javascript-live-preview-utils-sdk)

## SDK Installation and Setup

To install the .NET SDK, choose either of the following methods:
- **Via Package Manager**: Open the terminal and install the contentstack module using the following “Package Manager” command:

```
PM> Install-Package contentstack.csharp
```
- **Via .NET CLI**: Run the following .NET CLI command:

```
dotnet add package contentstack.csharp
```

After successful installation, to use the module in your application, you need to first add a namespace to your class:

```
using Contentstack.Core; // ContentstackClient
using Contentstack.Core.Models; // Stack, Query, Entry, Asset, ContentType
using Contentstack.Core.Configuration; // ContentstackOptions
```

## Initializing the Stack with Live Preview

Since the [Live Preview Utils SDK](/docs/developers/javascript-browser/about-javascript-live-preview-utils-sdk) is responsible for communication, you need to initialize it within your stack.

Add the `appsettings.json` command to initialize the stack:

```
{
  "ContentstackOptions": {
        "ApiKey": "",
        "DeliveryToken": "",
        "Environment": "",
        "LivePreview": {
	      "PreviewToken" : "",
	      "Enable" : true,
	      "Host" : "rest-preview.contentstack.com"
        }
    }
}
```

**Note**: By default, the `Host` parameter points to the North America endpoint. If your website is hosted on the European data center, then pass the [European](/docs/developers/contentstack-regions/europe-region-what-it-is-and-what-it-isnt) endpoint against the `Host` parameter.

## Configure the HTTP Request Pipeline

Use the following method to configure the HTTP request pipeline:

```
// Startup.cs
...
//Add following
using Contentstack.Core;
using System.Linq;
using Microsoft.Extensions.Primitives;

public class Startup
{
    ...
    public void ConfigureServices(IServiceCollection services)
    {
        ...
        services.AddContentstack(Configuration); //Contentstack Configuration
    }
    // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
    public void Configure(IApplicationBuilder app, IHostingEnvironment env)
    {
        ...
        app.UseCors(x => x.AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin()); //CORS to allow Contentstack origin
        app.Use(async (context, next) =>
        {
            var contentstackClient =  app.ApplicationServices.GetService();
            var dict = context.Request.Query.Keys.Cast().ToDictionary(k => k, v =>
                {
                    StringValues hash;
                    context.Request.Query.TryGetValue(v, out hash);
                    return hash.ToString();
                });
            try
            {
                await contentstackClient.LivePreviewQueryAsync(dict);
            }
            catch { }
            await next.Invoke();
        });
    }
}
```

## For Server-side Rendered Websites

To install and initialize the [Live Preview Utils SDK](/docs/developers/javascript-browser/about-javascript-live-preview-utils-sdk), you can refer to our [SSR Live Preview Setup](/docs/developers/set-up-live-preview/set-up-live-preview-for-your-website#server-side-rendering-ssr-) documentation.

Add the following script within the `head` tag of the “`_Host.chtml`” or “`Index.chtml`” file:

```
...
ContentstackLivePreview.init({
            enable: true,
            ssr: true,
            stackDetails: {
                apiKey: "API_KEY", //Stack API key
            },
        });
...
```

## Query Request

Contentstack SDKs let you interact with the [Content Delivery APIs](/docs/developers/apis/content-delivery-api) and retrieve content from Contentstack. They are read-only in nature. The SDKs fetch and deliver content from the nearest server via Fastly, our powerful and robust CDN.

To get an [entry](/docs/content-managers/author-content/about-entries), you need to specify the [content type](/docs/developers/create-content-types/about-content-types) UID and the UID of the entry.

```
client.ContentType("CONTENT_TYPE_UID").Query().Find();
client.ContentType("CONTENT_TYPE_UID").Entry(“ENTRY_UID”).Find();
```

## Timeline Preview

The Timeline Preview feature in the DotNet Delivery SDK allows you to preview different versions of an entry based on specific timestamps or scheduled releases—making it easier to test future or past content states.

For more information, refer to our [Timeline Preview](/docs/developers/set-up-timeline) documentation

## More Resources
- [JavaScript Live Preview Utils SDK](/docs/developers/sdks/content-delivery-sdk/javascript-browser/about-javascript-live-preview-utils-sdk)
- [.NET News App](/docs/developers/dot-net/get-started-with-dot-net-sdk)
- [.NET Liquid Template Website](/docs/developers/sample-apps/build-a-liquid-template-example-using-contentstack-dot-net-sdk)
- [API Reference](/docs/developers/sdks/content-delivery-sdk/dot-net/reference/)
- [.NET SDK Changelog](/docs/developers/sdks/content-delivery-sdk/dot-net/dot-net-sdk-changelog/)
- [View and Download .NET SDK repository on GitHub](https://github.com/contentstack/contentstack-dotnet)

## Common questions

### Do I need the Live Preview Utils SDK to use Live Preview with the .NET SDK?
Yes. “Since the [Live Preview Utils SDK](/docs/developers/javascript-browser/about-javascript-live-preview-utils-sdk) is responsible for communication, you need to initialize it within your stack.”

### Where do I configure the Live Preview host and preview token?
In `appsettings.json` under `ContentstackOptions` → `LivePreview`, including `PreviewToken`, `Enable`, and `Host`.

### What should I do if my website is hosted on the European data center?
Use the [European](/docs/developers/contentstack-regions/europe-region-what-it-is-and-what-it-isnt) endpoint against the `Host` parameter instead of the default North America endpoint.

### How do I fetch entries using the .NET SDK?
Use the content type UID and entry UID, for example:
```
client.ContentType("CONTENT_TYPE_UID").Query().Find();
client.ContentType("CONTENT_TYPE_UID").Entry(“ENTRY_UID”).Find();
```
