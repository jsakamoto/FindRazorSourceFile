using FindRazorSourceFile.Test.Internals;

namespace FindRazorSourceFile.Test;

public static class Expected
{
    public static IReadOnlyDictionary<string, IEnumerable<string>> GetMapFilesContents(BuildTestContext context)
    {
        var clientProjectDir = context.HostingModel == "Client" ? context.HostProjectDir : context.SecondaryHostProjectDir;
        return new Dictionary<string, IEnumerable<string>>
        {
            ["Client"] = [
                @$"SampleSite.Client|Pages\_Imports.razor|{clientProjectDir}\Pages\_Imports.razor",
                @$"SampleSite.Client|Pages\Bar.razor|{clientProjectDir}\Pages\Bar.razor",
            ],
            ["Host"] = [],
            ["Server"] = [
                @$"SampleSite.Server|Pages\_Imports.razor|{context.HostProjectDir}\Pages\_Imports.razor",
                @$"SampleSite.Server|Pages\Bar.razor|{context.HostProjectDir}\Pages\Bar.razor",
            ],
            ["Components"] = [
                @$"SampleSite.Components|Pages\Counter.razor|{context.ComponentProjectDir}\Pages\Counter.razor",
                @$"SampleSite.Components|Pages\FetchData.razor|{context.ComponentProjectDir}\Pages\FetchData.razor",
                @$"SampleSite.Components|Pages\Index.razor|{context.ComponentProjectDir}\Pages\Index.razor",
                @$"SampleSite.Components|Shared\AboutBlazor.razor|{context.ComponentProjectDir}\Shared\AboutBlazor.razor",
                @$"SampleSite.Components|Shared\HotKeyInfo.razor|{context.ComponentProjectDir}\Shared\HotKeyInfo.razor",
                @$"SampleSite.Components|Shared\Icon.razor|{context.ComponentProjectDir}\Shared\Icon.razor",
                @$"SampleSite.Components|Shared\MainLayout.razor|{context.ComponentProjectDir}\Shared\MainLayout.razor",
                $@"SampleSite.Components|Shared\NavigationLink.razor|{context.ComponentProjectDir}\Shared\NavigationLink.razor",
                @$"SampleSite.Components|Shared\NavMenu.razor|{context.ComponentProjectDir}\Shared\NavMenu.razor",
                @$"SampleSite.Components|Shared\SurveyPrompt.razor|{context.ComponentProjectDir}\Shared\SurveyPrompt.razor",
                @$"SampleSite.Components|Shared\TitleHeader.razor|{context.ComponentProjectDir}\Shared\TitleHeader.razor",
                @$"SampleSite.Components|_Imports.razor|{context.ComponentProjectDir}\_Imports.razor",
                @$"SampleSite.Components|App.razor|{context.ComponentProjectDir}\App.razor",
            ],
        };
    }
}
