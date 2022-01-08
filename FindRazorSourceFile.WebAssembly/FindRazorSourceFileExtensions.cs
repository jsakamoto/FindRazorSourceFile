using Microsoft.AspNetCore.Components.WebAssembly.Hosting;

namespace FindRazorSourceFile.WebAssembly
{
    public static class FindRazorSourceFileExtensions
    {
        public static WebAssemblyHostBuilder UseFindRazorSourceFile(this WebAssemblyHostBuilder builder)
        {
            builder.RootComponents.Add<ScriptInjectorComponent>("script[src]");
            return builder;
        }
    }
}
