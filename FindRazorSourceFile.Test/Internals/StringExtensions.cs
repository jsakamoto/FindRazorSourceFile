namespace FindRazorSourceFile.Test.Internals;

internal static class StringExtensions
{
    internal static string NormalizeLineEndings(this string input)
    {
        return input.Replace("\r\n", "\n").Replace("\r", "\n").TrimEnd();
    }
}
