using Microsoft.AspNetCore.Components.WebAssembly.Hosting;

namespace FindRazorSourceFile.WebAssembly;

internal static class FindRazorSourceFileExtensions
{
    public static WebAssemblyHostBuilder UseFindRazorSourceFile(this WebAssemblyHostBuilder builder)
    {
#if ENABLE_FIND_RAZOR_SOURCE_FILE
        builder.RootComponents.Add<ScriptInjectorComponent>("script[src]");
#endif
        return builder;
    }
}
