using System.Text.Json;

namespace FindRazorSourceFile.Test.Internals;

internal static class JsonExtensions
{
    public static Nullable<JsonElement> GetObject(this JsonElement value, string propertyName)
    {
        if (value.TryGetProperty(propertyName, out var property) && property.ValueKind == JsonValueKind.Object) return new Nullable<JsonElement>(property);
        return null;
    }

    public static Nullable<JsonElement> GetObject(this Nullable<JsonElement> value, string propertyName)
    {
        if (value.HasValue && value.Value.TryGetProperty(propertyName, out var property) && property.ValueKind == JsonValueKind.Object) return new Nullable<JsonElement>(property);
        return null;
    }

    public static IEnumerable<JsonProperty> EnumerateObject(this Nullable<JsonElement> value)
    {
        if (!value.HasValue || value.Value.ValueKind != JsonValueKind.Object) yield break;
        foreach (var property in value.Value.EnumerateObject())
        {
            yield return property;
        }
    }

    public static IEnumerable<string> EnumerateTextArray(this Nullable<JsonElement> value)
    {
        if (!value.HasValue || value.Value.ValueKind != JsonValueKind.Array) yield break;
        foreach (var property in value.Value.EnumerateArray())
        {
            if (property.ValueKind == JsonValueKind.String)
            {
                yield return property.GetString() ?? string.Empty;
            }
        }
    }
}
