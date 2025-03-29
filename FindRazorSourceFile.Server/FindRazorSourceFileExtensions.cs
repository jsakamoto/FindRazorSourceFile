using FindRazorSourceFile.Server.Internals;
using Microsoft.AspNetCore.Builder;

namespace FindRazorSourceFile.Server;

public static class FindRazorSourceFileExtensions
{
    public static IApplicationBuilder UseFindRazorSourceFile(this IApplicationBuilder app)
    {
        return app.UseMiddleware<ScriptInjectingMiddleware>();
    }
}
