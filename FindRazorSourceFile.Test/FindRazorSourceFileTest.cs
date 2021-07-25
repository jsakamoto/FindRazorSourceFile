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

        [Test, TestCaseSource(typeof(FindRazorSourceFileTest), nameof(HostingModels))]
        public async Task DotNetBuild_Test(string hostingModel)
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
            incrementalBuildProcess.ExitCode.Is(0, message: incrementalBuildProcess.StdOutput + incrementalBuildProcess.StdError);

            // Validate the 2nd build result again, and nothing should have changed.
            ValidateBuildResult(context);
        }

        private static void ValidateBuildResult(BuildTestContext context)
        {
            // [Validate 1] map files of the host project were generated properly.
            Directory.Exists(context.MapFilesDirOfHost).IsTrue(message: $"{context.MapFilesDirOfHost} should be exist.");
            Directory.GetFiles(context.MapFilesDirOfHost, "*.txt")
                .OrderBy(path => path)
                .Select(path => new MapFile(Path.GetFileName(path), File.ReadAllText(path).TrimEnd()))
                .Is(Expected.MapFilesOfHost[context.HostingModel]);

            // [Validate 2] map files of the component project were generated properly.
            Directory.Exists(context.MapFilesDirOfComponent).IsTrue(message: $"{context.MapFilesDirOfComponent} should be exist.");
            Directory.GetFiles(context.MapFilesDirOfComponent, "*.txt")
                .OrderBy(path => path)
                .Select(path => new MapFile(Path.GetFileName(path), File.ReadAllText(path).TrimEnd()))
                .Is(Expected.MapFilesOfComponent);

            // [Validate 3] exists static web assets metadata file.
            File.Exists(context.StaticWebAssetsMetaPath).IsTrue(message: $"{context.StaticWebAssetsMetaPath} should be exist.");
            var staticWebAssetsMetaDoc = XDocument.Load(context.StaticWebAssetsMetaPath);

            // [Validate 4] static web assets metadata includes a mapping for host project.
            staticWebAssetsMetaDoc.XPathSelectElements(
                $"/StaticWebAssets/ContentRoot[@BasePath='_content/FindRazorSourceFile/RazorSourceMapFiles'][@Path='{context.MapFilesDirOfHost}']"
            ).Any().IsTrue();

            // [Validate 5] static web assets metadata includes a mapping for component project.
            staticWebAssetsMetaDoc.XPathSelectElements(
                $"/StaticWebAssets/ContentRoot[@BasePath='_content/FindRazorSourceFile/RazorSourceMapFiles'][@Path='{context.MapFilesDirOfComponent}']"
            ).Any().IsTrue();
        }
    }
}