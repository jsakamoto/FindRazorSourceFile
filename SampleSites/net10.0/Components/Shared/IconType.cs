using System;

namespace SampleSite.Components.Shared;

public enum IconType
{
    None,
    Home,
    Plus,
    ListRich,
    Cog,
    Pencil
}

public static class IconTypeExtensions
{
    public static string ToIconName(this IconType iconType)
    {
        return iconType switch
        {
            IconType.None => string.Empty,
            IconType.Home => "home",
            IconType.Plus => "plus",
            IconType.ListRich => "list-rich",
            IconType.Cog => "cog",
            IconType.Pencil => "pencil",
            _ => throw new ArgumentOutOfRangeException(nameof(iconType), iconType, null)
        };
    }
}
