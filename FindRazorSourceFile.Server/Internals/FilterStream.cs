using Microsoft.AspNetCore.Http;

namespace FindRazorSourceFile.Server.Internals;

internal delegate Task WriteAsyncInvoker(byte[] buffer, int offset, int count, CancellationToken cancellationToken);

internal delegate Task FlushAsyncInvoker(CancellationToken cancellationToken);

internal class FilterStream : Stream
{
    private readonly HttpContext HttpContext;

    internal readonly MemoryStream MemoryStream;

    internal readonly Stream OriginalStream;

    private bool _IsCaptured;

    private WriteAsyncInvoker WriteAsyncInvoker;

    private FlushAsyncInvoker FlushAsyncInvoker;

    public override bool CanRead => false;

    public override bool CanSeek => false;

    public override bool CanTimeout => false;

    public override bool CanWrite => true;

    public override long Length => throw new NotSupportedException();

    public override long Position
    {
        get => throw new NotSupportedException();
        set => throw new NotSupportedException();
    }

    public FilterStream(HttpContext httpContext)
    {
        this.HttpContext = httpContext;
        this.MemoryStream = new MemoryStream();
        this.OriginalStream = this.HttpContext.Response.Body;
        this.HttpContext.Response.Body = this;

        this.WriteAsyncInvoker = this.DefaultWriteAsyncInvoker;
        this.FlushAsyncInvoker = this.DefaultFlushAsyncInvoker;
    }

    public void RevertResponseBodyHooking()
    {
        this.HttpContext.Response.Body = this.OriginalStream;
    }

    private Task DefaultWriteAsyncInvoker(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
    {
        return this.RebindInvokers().WriteAsync(buffer, offset, count, cancellationToken);
    }

    private Task DefaultFlushAsyncInvoker(CancellationToken cancellationToken)
    {
        return this.RebindInvokers().FlushAsync(cancellationToken);
    }

    private Stream RebindInvokers()
    {
        this._IsCaptured = this.HttpContext.Response.ContentType?.StartsWith("text/html") == true;
        var stream = this._IsCaptured ? this.MemoryStream : this.OriginalStream;
        this.WriteAsyncInvoker = stream.WriteAsync;
        this.FlushAsyncInvoker = stream.FlushAsync;
        return stream;
    }

    internal bool IsCaptured() => this._IsCaptured;

    public override int Read(byte[] buffer, int offset, int count) => throw new NotSupportedException();

    public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

    public override void SetLength(long value) => throw new NotSupportedException();

    public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

    public override Task WriteAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
    {
        return this.WriteAsyncInvoker(buffer, offset, count, cancellationToken);
    }

    public override void Flush() => throw new NotSupportedException();

    public override Task FlushAsync(CancellationToken cancellationToken)
    {
        return this.FlushAsyncInvoker(cancellationToken);
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        this.MemoryStream.Dispose();
    }
}
