using Microsoft.AspNetCore.Components.WebAssembly.Hosting;

namespace FindRazorSourceFile.WebAssembly;

internal static class FindRazorSourceFileExtensions
{
    /// <summary>
    /// [Obsolete]<br/>
    /// This method is no longer needed to use FindRazorSource. <br/>
    /// For more details, see: https://github.com/jsakamoto/FindRazorSourceFile/blob/master/DEPRECATION.md
    /// </summary>
    [System.Obsolete("This method is no longer needed to use FindRazorSource. For more details, see: https://github.com/jsakamoto/FindRazorSourceFile/blob/master/DEPRECATION.md")]
    public static WebAssemblyHostBuilder UseFindRazorSourceFile(this WebAssemblyHostBuilder builder)
    {
        return builder;
    }
}
