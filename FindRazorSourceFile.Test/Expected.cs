using System.Collections.Generic;
using FindRazorSourceFile.Test.Internals;

namespace FindRazorSourceFile.Test
{
    public static class Expected
    {
        public static readonly IEnumerable<MapFile> MapFilesOfComponent = new MapFile[] {
                new("b-1s51sonau2.txt", @"SampleSite.Components|Pages\Counter.razor"),
                new("b-49z80ty0e7.txt", @"SampleSite.Components|_Imports.razor"),
                new("b-69jeqg1gtr.txt", @"SampleSite.Components|Shared\SurveyPrompt.razor"),
                new("b-gfom3a1odh.txt", @"SampleSite.Components|Pages\FetchData.razor"),
                new("b-h15b7qgxln.txt", @"SampleSite.Components|Shared\NavMenu.razor"),
                new("b-n3o2mhseko.txt", @"SampleSite.Components|Pages\Index.razor"),
                new("b-r7lodfplh3.txt", @"SampleSite.Components|Shared\MainLayout.razor"),
                new("b-tgeelat6os.txt", @"SampleSite.Components|App.razor"),
            };

        public static readonly IReadOnlyDictionary<string, IEnumerable<MapFile>> MapFilesOfHost = new Dictionary<string, IEnumerable<MapFile>>
        {
            ["Client"] = new MapFile[] {
                new("b-zet8bdnfpi.txt", @"SampleSite.Client|Pages\Bar.razor"),
            },
            ["Server"] = new MapFile[] {
                // EMPTY
            },
        };
    }
}
