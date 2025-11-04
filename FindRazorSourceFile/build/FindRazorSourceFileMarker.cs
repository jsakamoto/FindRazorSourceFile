using System.Numerics;
using System.Security.Cryptography;
using System.Text;
using System.Runtime.CompilerServices;
using Microsoft.AspNetCore.Components;

namespace FindRazorSourceFile;

/// <summary>
/// Provides methods to insert explicit markers at the beginning and end of a Razor component for the "FindRazorSourceFile" tool.
/// </summary>
internal static class FindRazorSourceFileMarker
{
#if ENABLE_FIND_RAZOR_SOURCE_FILE
    private static string ToBase36(byte[] hash)
    {
        var array = new char[10];
        var buff = new byte[10];
        Array.Copy(hash, buff, 10);
        var dividend = BigInteger.Abs(new BigInteger(buff));
        for (var i = 0; i < 10; i++)
        {
            dividend = BigInteger.DivRem(dividend, 36, out var remainder);
            array[i] = "0123456789abcdefghijklmnopqrstuvwxyz"[(int)remainder];
        }
        return new string(array);
    }

    /// <summary>
    /// Inserts an explicit marker at the beginning of a Razor component for use by the "FindRazorSourceFile" tool.
    /// </summary>
    public static MarkupString FRSF_BEGIN_COMPONENT([CallerFilePath] string sourcePath = "")
    {
        return new MarkupString($"<!-- begin:frsf-{ToBase36(SHA256.HashData(Encoding.UTF8.GetBytes(sourcePath)))} -->");
    }

    /// <summary>
    /// Inserts an explicit marker at the end of a Razor component for use by the "FindRazorSourceFile" tool.
    /// </summary>
    public static MarkupString FRSF_END_COMPONENT([CallerFilePath] string sourcePath = "")
    {
        return new MarkupString($"<!-- end:frsf-{ToBase36(SHA256.HashData(Encoding.UTF8.GetBytes(sourcePath)))} -->");
    }
#else
    /// <summary>
    /// Inserts an explicit marker at the beginning of a Razor component for use by the "FindRazorSourceFile" tool.
    /// </summary>
    public static string? FRSF_BEGIN_COMPONENT() => null;

    /// <summary>
    /// Inserts an explicit marker at the end of a Razor component for use by the "FindRazorSourceFile" tool.
    /// </summary>
    public static string? FRSF_END_COMPONENT() => null;
#endif
}
