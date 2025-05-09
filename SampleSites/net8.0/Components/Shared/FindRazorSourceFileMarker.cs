using System.Numerics;
using System.Security.Cryptography;
using System.Text;
#if true
using System.Runtime.CompilerServices;
using Microsoft.AspNetCore.Components;
#endif

namespace FindRazorSourceFile;


internal static class FindRazorSourceFileMarker
{
    private static byte[] ComputeHash(string path)
    {
        using var sha256 = SHA256.Create();
        return sha256.ComputeHash(Encoding.UTF8.GetBytes(path));
    }

    static string ToBase36(byte[] hash)
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
#if true
    public static MarkupString FRSF_BEGIN_COMPONENT([CallerFilePath] string sourcePath = "")
    {
        return new MarkupString($"<!-- begin:frsf-{ToBase36(ComputeHash(sourcePath))} -->");
    }

    public static MarkupString FRSF_END_COMPONENT([CallerFilePath] string sourcePath = "")
    {
        return new MarkupString($"<!-- end:frsf-{ToBase36(ComputeHash(sourcePath))} -->");
    }
#else
    public static string? FRSF_BEGIN_COMPONENT() => null;
    public static string? FRSF_END_COMPONENT() => null;
#endif
}
