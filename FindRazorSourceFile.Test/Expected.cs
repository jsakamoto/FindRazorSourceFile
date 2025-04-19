using FindRazorSourceFile.Test.Internals;

namespace FindRazorSourceFile.Test;

public static class Expected
{
    public static IEnumerable<MapFile> GetMapFilesOfComponent(string projectDir) => [
        new("b-1s51sonau2.txt", @$"SampleSite.Components|Pages\Counter.razor|{projectDir}\Pages\Counter.razor"),
        new("b-2v9oi7dnmo.txt", @$"SampleSite.Components|Shared\HotKeyInfo.razor|{projectDir}\Shared\HotKeyInfo.razor"),
        new("b-49z80ty0e7.txt", @$"SampleSite.Components|_Imports.razor|{projectDir}\_Imports.razor"),
        new("b-51yzecat44.txt", $@"SampleSite.Components|Shared\NavigationLink.razor|{projectDir}\Shared\NavigationLink.razor"),
        new("b-69jeqg1gtr.txt", @$"SampleSite.Components|Shared\SurveyPrompt.razor|{projectDir}\Shared\SurveyPrompt.razor"),
        new("b-f2lakf9iba.txt", @$"SampleSite.Components|Shared\Icon.razor|{projectDir}\Shared\Icon.razor"),
        new("b-gfom3a1odh.txt", @$"SampleSite.Components|Pages\FetchData.razor|{projectDir}\Pages\FetchData.razor"),
        new("b-h15b7qgxln.txt", @$"SampleSite.Components|Shared\NavMenu.razor|{projectDir}\Shared\NavMenu.razor"),
        new("b-lolw6vbxt0.txt", @$"SampleSite.Components|Shared\AboutBlazor.razor|{projectDir}\Shared\AboutBlazor.razor"),
        new("b-n3o2mhseko.txt", @$"SampleSite.Components|Pages\Index.razor|{projectDir}\Pages\Index.razor"),
        new("b-r7lodfplh3.txt", @$"SampleSite.Components|Shared\MainLayout.razor|{projectDir}\Shared\MainLayout.razor"),
        new("b-tgeelat6os.txt", @$"SampleSite.Components|App.razor|{projectDir}\App.razor"),
        new("b-tx0gxgvhtx.txt", @$"SampleSite.Components|Shared\TitleHeader.razor|{projectDir}\Shared\TitleHeader.razor")
    ];

    public static IReadOnlyDictionary<string, IEnumerable<MapFile>> GetMapFilesOfHost(string projectDir) => new Dictionary<string, IEnumerable<MapFile>>
    {
        ["Client"] = [new("b-zet8bdnfpi.txt", @$"SampleSite.Client|Pages\Bar.razor|{projectDir}\Pages\Bar.razor")],
        ["Server"] = [], // EMPTY
    };
}
