# Migration Guide: Moving to FindRazorSourceFile v1.0.0-preview.15

With version `v1.0.0-preview.15`, **FindRazorSourceFile** introduces major improvements that simplify usage and remove previous setup requirements. This guide explains the changes and provides instructions for migrating from earlier versions (v1.0.0-preview.14 and below).


## 🚀 What's New in v1.0.0-preview.15

### Unified NuGet Package

In previous versions, you needed to select a different NuGet package depending on whether your project was a Razor Class Library, a Blazor WebAssembly App, or a Blazor Server App. With this release, you only need to reference the single **`FindRazorSourceFile`** package, which works across all Blazor platforms. Regardless of your hosting model, adding this unified package to your project is all that is required.

### Zero Configuration Required

You no longer need to modify your `Program.cs` to enable FindRazorSourceFile.  
Simply installing the package activates the tool.

## 🔄 Migration Steps

If you are currently using any of the following packages:

- `FindRazorSource`
- `FindRazorSourceFile.WebAssembly`
- `FindRazorSourceFile.Server`

You should:

1. **Remove** those package references from your project.
2. **Install** the new unified package instead:

```shell
dotnet add package FindRazorSourceFile --version 1.0.0-preview.15
```

3. **Remove any manual configuration code** related to FindRazorSourceFile from your `Program.cs`.  
(This is no longer necessary.)


## ⚠️ Deprecated Packages and API

The following packages are still available in version `1.0.0-preview.15`, but they no longer contain any functionality:

- `FindRazorSourceFile.WebAssembly`
- `FindRazorSourceFile.Server`

They exist only to support older projects during the transition and now include types marked with the `[Obsolete]` attribute. These obsolete classes and methods will display messages pointing to this document, encouraging migration to the unified package.

> 🔧 **Backward compatibility is maintained**, but users are strongly encouraged to migrate to the new approach.


## 💡 Why This Change?

This migration simplifies development workflows by:

- Reducing cognitive load (no need to choose the right package for the platform).
- Enabling a unified NuGet package reference via `Directory.Build.props`, making it easier to manage dependencies across multiple projects in a solution.
- Eliminating boilerplate configuration code.
