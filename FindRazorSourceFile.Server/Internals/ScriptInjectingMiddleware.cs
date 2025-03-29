using System.Text;
using AngleSharp.Dom;
using AngleSharp.Html.Parser;
using Microsoft.AspNetCore.Http;

namespace FindRazorSourceFile.Server.Internals;

internal class ScriptInjectingMiddleware
{
    private readonly RequestDelegate _next;

    public ScriptInjectingMiddleware(RequestDelegate next)
    {
        this._next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var filter = new FilterStream(context);

        try
        {
            await this._next(context);

            if (filter.IsCaptured())
            {
                filter.MemoryStream.Seek(0, SeekOrigin.Begin);
                var parser = new HtmlParser();
                using var doc = parser.ParseDocument(filter.MemoryStream);

                doc.Body.Insert(AdjacentPosition.BeforeEnd,
                    "<script type=\"module\">import { init } from './_content/FindRazorSourceFile/script.js'; init();</script>");

                filter.MemoryStream.SetLength(0);
                var encoding = Encoding.UTF8;
                using var writer = new StreamWriter(filter.MemoryStream, bufferSize: -1, leaveOpen: true, encoding: encoding) { AutoFlush = true };
                doc.ToHtml(writer, new CustomHtmlMarkupFormatter());

                context.Response.ContentLength = filter.MemoryStream.Length;
                filter.MemoryStream.Seek(0, SeekOrigin.Begin);
                await filter.MemoryStream.CopyToAsync(filter.OriginalStream);
            }
        }
        finally
        {
            filter.RevertResponseBodyHooking();
        }
    }
}
