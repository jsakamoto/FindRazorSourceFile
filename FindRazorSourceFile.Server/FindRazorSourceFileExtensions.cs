using Microsoft.AspNetCore.Builder;

namespace FindRazorSourceFile.Server;

public static class FindRazorSourceFileExtensions
{
    /// <summary>
    /// [Obsolete]<br/>
    /// This method is no longer needed to use FindRazorSource. <br/>
    /// For more details, see: https://github.com/jsakamoto/FindRazorSourceFile/blob/master/DEPRECATION.md
    /// </summary>
    [Obsolete("This method is no longer needed to use FindRazorSource. For more details, see: https://github.com/jsakamoto/FindRazorSourceFile/blob/master/DEPRECATION.md")]
    public static IApplicationBuilder UseFindRazorSourceFile(this IApplicationBuilder app)
    {
        return app;
    }
}
