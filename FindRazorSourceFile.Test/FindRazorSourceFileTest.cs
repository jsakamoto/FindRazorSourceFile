using FindRazorSourceFile.Test.Internals;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using Toolbelt.Diagnostics;

namespace FindRazorSourceFile.Test;

public class FindRazorSourceFileTest
{
    public static IEnumerable<string> HostingModels { get; } = [
        "Client",
        "Server"
    ];

    [Test, TestCaseSource(typeof(FindRazorSourceFileTest), nameof(HostingModels))]
    public async Task DotNet8Build_Test(string hostingModel)
    {
        using var context = new BuildTestContext(hostingModel, "net8.0");

        // 1st, build both host project and component project.
        using var initialBuildProcess = XProcess.Start(
            "dotnet", $"build -c:Debug -o:\"{context.OutputDir}\"", workingDirectory: context.HostProjectDir);
        await initialBuildProcess.WaitForExitAsync();
        initialBuildProcess.ExitCode.Is(0, message: initialBuildProcess.StdOutput + initialBuildProcess.StdError);

        // Validate the 1st build result.
        ValidateNet8BuildResult(context);

        // 2nd, build only host project. (reproduce incremental build forcibly.)
        using var incrementalBuildProcess = XProcess.Start(
            "dotnet", $"build --no-dependencies -c:Debug -o:\"{context.OutputDir}\"", workingDirectory: context.HostProjectDir);
        await incrementalBuildProcess.WaitForExitAsync();
        incrementalBuildProcess.ExitCode.Is(0, message: incrementalBuildProcess.StdOutput + incrementalBuildProcess.StdError);

        // Validate the 2nd build result again, and nothing should have changed.
        ValidateNet8BuildResult(context);
    }

    private static void ValidateNet8BuildResult(BuildTestContext context)
    {
        // [Validate 1] map files of the host project were generated properly.
        Directory.Exists(context.MapFilesDirOfHost).IsTrue(message: $"{context.MapFilesDirOfHost} should be exist.");
        Directory.GetFiles(context.MapFilesDirOfHost, "*.txt")
            .OrderBy(path => path)
            .Select(path => new MapFile(Path.GetFileName(path), File.ReadAllText(path).TrimEnd()))
            .Is(Expected.GetMapFilesOfHost(context.HostProjectDir)[context.HostingModel]);

        // [Validate 2] map files of the component project were generated properly.
        Directory.Exists(context.MapFilesDirOfComponent).IsTrue(message: $"{context.MapFilesDirOfComponent} should be exist.");
        Directory.GetFiles(context.MapFilesDirOfComponent, "*.txt")
            .OrderBy(path => path)
            .Select(path => new MapFile(Path.GetFileName(path), File.ReadAllText(path).TrimEnd()))
            .Is(Expected.GetMapFilesOfComponent(context.ComponentProjectDir));

        // [Validate 3] exists static web assets metadata file.
        // TODO: Temporary, this test does not work. It depends on the version of the .NET SDK.
        // File.Exists(context.StaticWebAssetsJsonPath).IsTrue(message: $"{context.StaticWebAssetsJsonPath} should be exist.");
        File.Exists(context.StaticWebAssetsRuntimeJsonPath).IsTrue(message: $"{context.StaticWebAssetsRuntimeJsonPath} should be exist.");
        // var staticWebAssetsJson = JObject.Parse(File.ReadAllText(context.StaticWebAssetsJsonPath));
        var staticWebAssetsRuntimeJson = JObject.Parse(File.ReadAllText(context.StaticWebAssetsRuntimeJsonPath));

        // [Validate 4] static web assets metadata includes a mapping for host project.
        // TODO: Temporary, this test does not work. It depends on the version of the .NET SDK.
        //var mapFilesAssets = staticWebAssetsJson["Assets"]?
        //    .Where(asset => asset["SourceId"]?.ToString() == "FindRazorSourceFile.RazorSourceMapFiles")
        //    .ToArray();
        //if (mapFilesAssets == null) throw new NullReferenceException();

        var mapFilesRuntimes = staticWebAssetsRuntimeJson
            ["Root"]?["Children"]?
            ["_content"]?["Children"]?
            ["FindRazorSourceFile"]?["Children"]?
            ["RazorSourceMapFiles"]?["Children"];
        if (mapFilesRuntimes == null) throw new NullReferenceException();

        foreach (var mapFile in Expected.GetMapFilesOfComponent(context.ComponentProjectDir))
        {
            var relativePath = $"_content/FindRazorSourceFile/RazorSourceMapFiles/{mapFile.FileName}";
            var fullPath = Path.Combine(context.MapFilesDirOfComponent, mapFile.FileName);

            // TODO: Temporary, this test does not work. It depends on the version of the .NET SDK.
            //var mapFileAsset = mapFilesAssets.First(a => a["RelativePath"]?.ToString() == relativePath);
            //mapFileAsset["Identity"]?.ToString().Is(fullPath);
            //mapFileAsset["SourceType"]?.ToString().Is("Project");
            //mapFileAsset["ContentRoot"]?.ToString().Is(context.MapFilesDirOfComponent);
            //mapFileAsset["BasePath"]?.ToString().Is("/");
            //mapFileAsset["RelativePath"]?.ToString().Is(relativePath);
            //mapFileAsset["AssetKind"]?.ToString().Is("All");
            //mapFileAsset["AssetMode"]?.ToString().Is("All");
            //mapFileAsset["AssetRole"]?.ToString().Is("Primary");
            //mapFileAsset["RelatedAsset"]?.ToString().Is("");
            //mapFileAsset["AssetTraitName"]?.ToString().Is("");
            //mapFileAsset["AssetTraitValue"]?.ToString().Is("");
            //mapFileAsset["CopyToOutputDirectory"]?.ToString().Is("");
            //mapFileAsset["CopyToPublishDirectory"]?.ToString().Is("Never");
            //mapFileAsset["OriginalItemSpec"]?.ToString().Is(fullPath);

            var mapFilesRuntime = mapFilesRuntimes[mapFile.FileName].IsNotNull();
            mapFilesRuntime["Children"]?.Type.Is(JTokenType.Null);
            mapFilesRuntime["Asset"]?["SubPath"]?.ToString().Is(mapFile.FileName);
            mapFilesRuntime["Patterns"]?.Type.Is(JTokenType.Null);
        }
    }
}