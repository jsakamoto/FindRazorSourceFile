using System.Text.Json;
using System.Text.RegularExpressions;

namespace FindRazorSourceFile.Test.Internals;

internal static class BlazorBootJson
{
    internal static JsonElement Read(string publishDir, out string? readFilePath)
    {
        readFilePath = null;
        var blazorBootJsonPath = Path.Combine(publishDir, "_framework", "blazor.boot.json");
        if (Path.Exists(blazorBootJsonPath))
        {
            readFilePath = blazorBootJsonPath;
            return JsonSerializer.Deserialize<JsonElement>(File.ReadAllText(blazorBootJsonPath));
        }

        var dotnetJsPath = Directory.GetFiles(Path.Combine(publishDir, "_framework"), "*.js")
            .Where(path => Regex.IsMatch(Path.GetFileNameWithoutExtension(path), "^((dotnet)|(dotnet\\.[^.]+))$"))
            .FirstOrDefault();
        if (!string.IsNullOrEmpty(dotnetJsPath) && Path.Exists(dotnetJsPath))
        {
            readFilePath = dotnetJsPath;
            var jsContent = File.ReadAllText(dotnetJsPath);
            var jsonStartMarker = "/*json-start*/";
            var startIndex = jsContent.IndexOf(jsonStartMarker);
            var endIndex = jsContent.IndexOf("/*json-end*/");
            if (startIndex >= 0 && endIndex > startIndex)
            {
                var jsonString = jsContent.Substring(startIndex + jsonStartMarker.Length, endIndex - (startIndex + jsonStartMarker.Length));
                return JsonSerializer.Deserialize<JsonElement>(jsonString);
            }
            throw new FileNotFoundException("blazor.boot.json content not found in the dotnet JS file.");
        }

        throw new FileNotFoundException("both blazor.boot.json and dotnet JS file not found in the publish directory.");
    }
}
