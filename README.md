# FindRazorSourceFile

[![NuGet Package](https://img.shields.io/nuget/v/FindRazorSourceFile.WebAssembly.svg?label=for+Blazor+WebAssembly)](https://www.nuget.org/packages/FindRazorSourceFile.WebAssembly/) [![NuGet Package](https://img.shields.io/nuget/v/FindRazorSourceFile.Server.svg?label=for+Blazor+Server)](https://www.nuget.org/packages/FindRazorSourceFile.Server/)

## What's this?

This package makes your Blazor apps display the source .razor file name that generated the HTML element under the mouse cursor when entering the `Ctrl` + `Shift` + `F` hotkeys.

![movie](https://raw.githubusercontent.com/jsakamoto/FindRazorSourceFile/master/.assets/movie-001-vs2022.gif)

![movie](https://raw.githubusercontent.com/jsakamoto/FindRazorSourceFile/master/.assets/movie-001-vscode.gif)

## 1. Installation

### 1-a. for Blazor WebAssembly projects

1. Add **the `FindRazorSource.WebAssembly` NuGet package** to your Blazor WebAssembly project.

```shell
> dotnet add package FindRazorSource.WebAssembly
```

2. Add calling of **the `UseFindRazorSourceFile()` extension method** for `WebAssemblyHostBuilder` at the startup of your Blazor WebAssembly app.

```csharp
// This is a "Program.cs" file of a Blazor Wasm app.
...
using FindRazorSourceFile.WebAssembly; // 👈 Open this namespace, and...
...
var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.UseFindRazorSourceFile(); // 👈 Add this line.
...
```

> [!NOTE]  
> The `UseFindRazorSourceFile()` method will work only when the target configuration is not "Release". That means any resources from "FindRazorSource" will not be loaded in the app after it is published with trimming. So, you don't need to worry about increasing the app size due to linking this library in the release environment. If you need to suppress the loading resources of this library in other configurations, please set the `EnableFindRazorSourceFile` property to `false` in the project file. For example, `<EnableFindRazorSourceFile>false</EnableFindRazorSourceFile>`.

### 1-b. for Blazor Server projects

1. Add **the `FindRazorSource.Server` NuGet package** to your Blazor Server project.

```shell
> dotnet add package FindRazorSource.Server
```

2. Add calling of **the `UseFindRazorSourceFile()` extension method** for `IApplicationBuilder` at the startup of your Blazor Server app.

```csharp
// This is a "Program.cs" file of a Blazor Server app.
...
using FindRazorSourceFile.Server; // 👈 Open this namespace, and...
...
var builder = WebApplication.CreateBuilder(args);
...
if (app.Environment.IsDevelopment())
{
    ...
    app.UseFindRazorSourceFile(); // 👈 Add this line.
}
...
```

### 1-c. for Blazor components library projects

What you have to do is just adding **the `FindRazorSource` NuGet package** to the library project.

```shell
> dotnet add package FindRazorSource
```

## 2. Usage

### 2-1. Entering the "Inspection Mode"

After installing `FindReSource` in your Blazor project, the Blazor app running in a web browser will respond to **`Ctrl` + `Shift` + `F` keyboard shortcuts** entering to **"Inspection Mode"**.

When the app entered "Inspection Mode," the entire browser screen will dim.

In this state, when you moved the mouse cursor, the HTML element under the mouse cursor will be highlighted, and **the tooltip that displayed the source .razor file name** generated that HTML element will appear.

### 2-2. Entering the "Lock Mode"

When you click an HTML element during the "Inspection Mode", the application's state will enter **the "Lock Mode"**.

During the "Lock Mode", hovering the mouse cursor over the other HTML elements will have no effects.

The highlighting of the HTML element and showing the tooltip will be maintained.

This mode will be helpful for you to selecting and copy to the clipboard the source .razor file name displayed on the tooltip.

### 2-3. Exit each mode

To escape from these modes, you can press **the `ESC` key**.

And also, the mouse click during the "Lock Mode" will exit that mode and return to "Inspection Mode".

## 3. Open in Visual Studio Code

Once you enable the `"Open the .razor file of the clicked component in VSCode"` option from the `"Find Razor Source File"` settings button, which is placed in the bottom-right corner of the page,

![fig.3](https://raw.githubusercontent.com/jsakamoto/FindRazorSourceFile/master/.assets/fig3.png)

the .razor file of you clicked component will be opened in a Visual Studio Code editor.


## 4. Open in Visual Studio IDE - the Visual Studio Extension for "FindRazorSourceFile"

If you are using Visual Studio IDE on Windows OS, please check out the Visual Studio Extension **"Find Razor Source File - Browser Link Extension / VS2022 Extension"** from the URL below.

- **for Visual Studio 2019** - https://marketplace.visualstudio.com/items?itemName=jsakamoto.findrazorsource-browserlink-vsix
- **for Visual Studio 2022** - https://marketplace.visualstudio.com/items?itemName=jsakamoto.findrazorsource-browserlink-vsix-2022

If you have installed the extension above in your Visual Studio IDE and configured everything required to enable the "BrowserLink" feature of Visual Studio, entering "Lock Mode" causes **opening the .razor file the source of clicked HTML element automatically in your Visual Studio!**

### 3-1. Requirements

- Visual Studio 2019 or 2022

### 3-2. Usage

To enable "Find Razor Source File - Browser Link Extension / VS2022 Extension", please follow the instruction below.

1. Of course, the target project must have installed the "FindRazorSource" feature, and please confirm the "Inspection Mode" and "Lock Mode" works well on a web browser before.

2. Check on the "Enable Browser Link" dropdown menu in the toolbar of your Visual Studio.

![fig.1](https://raw.githubusercontent.com/jsakamoto/FindRazorSourceFile/master/.assets/fig.1.png)

If you are using Visual Studio 2019, you have to do an additional instruction below. 

<details>
<summary>Additional instruction steps in VS2019</summary>

3. Add **the `Microsoft.VisualStudio.Web.BrowserLink` NuGet package** to your Blazor Server or ASP.NET Core host project.

```shell
> dotnet add package Microsoft.VisualStudio.Web.BrowserLink
```

4. Add calling of **the `UseBrowserLink()` extension method** for `IApplicationBuilder` at the startup of your Blazor Server app or ASP.NET Core host app.


```csharp
// This is a "Startup.cs" file of a Server app.
  ...
  public void Configure(IApplicationBuilder app, ...)
  {
    if (env.IsDevelopment())
    {
      ...      
      app.UseBrowserLink(); // 👈 Add this line.
      ...
    }
    ...
```

**IMPORTANT NOTICE:** Please place the calling `UseBrowserLink()` before the calling `UseFindRazorSourceFile()` if the project is a Blazor Server.

</details>

After doing the all steps of the instruction above and launch the project, the .razor source file will be opened in the Visual Studio when the HTML element is clicked in the "Inspection Mode" on a web browser! 👍

## License

[Mozilla Public License Version 2.0](https://github.com/jsakamoto/FindRazorSourceFile/blob/master/LICENSE.txt)