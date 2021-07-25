using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Xml.Linq;
using System.Xml.XPath;
using FindRazorSourceFile.Test.Internals;
using NUnit.Framework;
using Toolbelt.Diagnostics;

namespace FindRazorSourceFile.Test
{
    public class FindRazorSourceFileTest
    {
        private static string PathOf(string pathString) => Path.Combine(pathString.Split('/'));

        public static IEnumerable<string> HostingModels { get; } = new[] {
            "Client",
            // "Server",
        };

        public record MapFile(string FileName, string Contents);

        public static class Expected
        {
            public static readonly MapFile[] MapFilesOfComponent = new MapFile[] {
                new("b-1s51sonau2.txt", @"SampleSite.Components|Pages\Counter.razor"),
                new("b-49z80ty0e7.txt", @"SampleSite.Components|_Imports.razor"),
                new("b-69jeqg1gtr.txt", @"SampleSite.Components|Shared\SurveyPrompt.razor"),
                new("b-gfom3a1odh.txt", @"SampleSite.Components|Pages\FetchData.razor"),
                new("b-h15b7qgxln.txt", @"SampleSite.Components|Shared\NavMenu.razor"),
                new("b-n3o2mhseko.txt", @"SampleSite.Components|Pages\Index.razor"),
                new("b-r7lodfplh3.txt", @"SampleSite.Components|Shared\MainLayout.razor"),
                new("b-tgeelat6os.txt", @"SampleSite.Components|App.razor"),
            };
        }

        [Test, TestCaseSource(typeof(FindRazorSourceFileTest), nameof(HostingModels))]
        public async Task DotNetBuild_Wasm_Test(string hostingModel)
        {
            using var context = new BuildTestContext(hostingModel);

            // 1st, build both host project and component project.
            using var initialBuildProcess = XProcess.Start(
                "dotnet", $"build -c:Debug -o:\"{context.OutputDir}\"", workingDirectory: context.HostProjectDir);
            await initialBuildProcess.WaitForExitAsync();
            initialBuildProcess.ExitCode.Is(0, message: initialBuildProcess.StdOutput + initialBuildProcess.StdError);

            // Validate the 1st build result.
            ValidateBuildResult(context);

            // 2nd, build only host project. (reproduce incremental build forcibly.)
            using var incrementalBuildProcess = XProcess.Start(
                "dotnet", $"build --no-dependencies -c:Debug -o:\"{context.OutputDir}\"", workingDirectory: context.HostProjectDir);
            await incrementalBuildProcess.WaitForExitAsync();
            incrementalBuildProcess.ExitCode.Is(0, message: initialBuildProcess.StdOutput + initialBuildProcess.StdError);

            // Validate the 2nd build result again, and nothing should have changed.
            ValidateBuildResult(context);
        }

        private static void ValidateBuildResult(BuildTestContext context)
        {
            // [Validate 1] map files of the component project were generated properly.
            Directory.Exists(context.MapFilesDirOfComponent).IsTrue(message: $"{context.MapFilesDirOfComponent} should be exist.");
            Directory.GetFiles(context.MapFilesDirOfComponent, "*.txt")
                .OrderBy(path => path)
                .Select(path => new MapFile(Path.GetFileName(path), File.ReadAllText(path).TrimEnd()))
                .Is(Expected.MapFilesOfComponent);

            //Directory.Exists(mapFilesDirOfHost).IsTrue(message: $"{mapFilesDirOfHost} should be exist.");

            // [Validate 2] static web assets metadata includes a mapping for component project.
            File.Exists(context.StaticWebAssetsMetaPath).IsTrue(message: $"{context.StaticWebAssetsMetaPath} should be exist.");
            var staticWebAssetsMetaDoc = XDocument.Load(context.StaticWebAssetsMetaPath);
            //staticWebAssetsMetaDoc.XPathSelectElements(
            //    $"/StaticWebAssets/ContentRoot[@BasePath='_content/FindRazorSourceFile/RazorSourceMapFiles'][@Path='{mapFilesDirOfHost}']"
            //).Any().IsTrue();
            staticWebAssetsMetaDoc.XPathSelectElements(
                $"/StaticWebAssets/ContentRoot[@BasePath='_content/FindRazorSourceFile/RazorSourceMapFiles'][@Path='{context.MapFilesDirOfComponent}']"
            ).Any().IsTrue();
        }
    }
}