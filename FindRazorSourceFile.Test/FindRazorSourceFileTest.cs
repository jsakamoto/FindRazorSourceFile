using System.Text.Json;
using System.Text.RegularExpressions;
using FindRazorSourceFile.Test.Internals;
using NUnit.Framework;
using Toolbelt;
using Toolbelt.Diagnostics;

namespace FindRazorSourceFile.Test;

[Parallelizable(ParallelScope.Children)]
public class FindRazorSourceFileTest
{
    public static IEnumerable<object[]> TestCases { get; } =
        from hostingModel in new[] { "Client", "Host(Client)", "Server" }
        from targetFramework in new[] { "net8.0", "net9.0", "net10.0" }
        select new object[] { targetFramework, hostingModel };


    [TestCaseSource(typeof(FindRazorSourceFileTest), nameof(TestCases))]
    public async Task DotNetBuild_Twice_Test(string targetFramework, string hostingModel)
    {
        using var context = new BuildTestContext(targetFramework, hostingModel);

        // 1st, build both host project and component project.
        using var initialBuildProcess = XProcess.Start(
            "dotnet", $"build -c Debug", workingDirectory: context.HostProjectDir);
        await initialBuildProcess.WaitForExitAsync();
        initialBuildProcess.ExitCode.Is(0, message: initialBuildProcess.Output);

        // Validate the 1st build result.
        ValidateGeneratedRazorSourceMapFiles(context);

        // 2nd, build only host project. (reproduce incremental build forcibly.)
        using var incrementalBuildProcess = XProcess.Start(
            "dotnet", $"build --no-dependencies -c Debug", workingDirectory: context.HostProjectDir);
        await incrementalBuildProcess.WaitForExitAsync();
        incrementalBuildProcess.ExitCode.Is(0, message: incrementalBuildProcess.Output);

        // Validate the 2nd build result again, and nothing should have changed.
        ValidateGeneratedRazorSourceMapFiles(context);
    }

    private static void ValidateGeneratedRazorSourceMapFiles(BuildTestContext context)
    {
        // Gather all razor source map files from the host, component, and secondary host intermediate directories.
        var mapFilesDirs = new[] { context.MapFilesDirOfHost, context.MapFilesDirOfComponent, context.MapFilesDirOfSecondaryHost }.Where(dir => !string.IsNullOrEmpty(dir));
        var allMapFiles =
            mapFilesDirs.SelectMany(dir => Directory.GetFiles(dir, "*.txt"))
            .Select(path => new MapFile(Path.GetFileName(path), File.ReadAllText(path).TrimEnd()))
            .ToArray();

        // Categorize map files by their prefixes.
        var mapFileGroups = new[]{
            allMapFiles.Where(m => m.FileName.StartsWith("b-")),
            allMapFiles.Where(m => m.FileName.StartsWith("frsf-"))
        };

        // Construct expected map file contents based on the context.
        var expectedMapFilesContentSet = Expected.GetMapFilesContents(context);
        var expectedMapFilesContentLines = new[]{
            expectedMapFilesContentSet[context.HostingModel],
            expectedMapFilesContentSet["Components"],
            string.IsNullOrEmpty(context.SecondaryHostModel) ? [] : expectedMapFilesContentSet[context.SecondaryHostModel],
        }.SelectMany(lines => lines).ToArray();

        // Validate that each map file group contains the expected contents.
        foreach (var mapFileGroup in mapFileGroups)
        {
            foreach (var expectedMapFileContent in expectedMapFilesContentLines)
            {
                mapFileGroup.Any(m => m.Contents == expectedMapFileContent)
                    .IsTrue(message: $"The map file content should be generated: {expectedMapFileContent}");
            }
        }
    }

    [TestCaseSource(typeof(FindRazorSourceFileTest), nameof(TestCases))]
    public async Task DotNetRun_Test(string targetFramework, string hostingModel)
    {
        // Given
        using var context = new BuildTestContext(targetFramework, hostingModel);
        var url = $"http://localhost:{NetworkTool.GetAvailableTcpPort()}";

        // When
        using var dotNetRun = XProcess.Start(
            "dotnet", $"run -c Debug --urls {url}", workingDirectory: context.HostProjectDir);
        var appStarted = await dotNetRun.WaitForOutputAsync(output => output.Contains("Application started."), options => options.IdleTimeout = 15000);
        appStarted.IsTrue(message: $"The app should start successfully. {dotNetRun.Output}");

        // Then: Validate the app is running and serving the map files.
        var mapFilesDirs = new[] { context.MapFilesDirOfHost, context.MapFilesDirOfComponent, context.MapFilesDirOfSecondaryHost }.Where(dir => !string.IsNullOrEmpty(dir));
        var allMapFiles =
            mapFilesDirs.SelectMany(dir => Directory.GetFiles(dir, "*.txt"))
            .Select(path => new MapFile(Path.GetFileName(path), File.ReadAllText(path).TrimEnd()))
            .ToArray();

        using var httpClient = new HttpClient();
        foreach (var mapFile in allMapFiles)
        {
            var response = await httpClient.GetAsync($"{url}/_content/FindRazorSourceFile/RazorSourceMapFiles/{mapFile.FileName}");
            response.IsSuccessStatusCode.IsTrue(message: $"The map file {mapFile.FileName} should be served successfully. {response.StatusCode}");
            var mapFileContent = await response.Content.ReadAsStringAsync();
            mapFileContent.TrimEnd().Is(mapFile.Contents, message: $"The content of the map file {mapFile.FileName} should match.");
        }
    }

    [TestCaseSource(typeof(FindRazorSourceFileTest), nameof(TestCases))]
    public async Task DotNetPublish_Test(string targetFramework, string hostingModel)
    {
        // Given
        using var context = new BuildTestContext(targetFramework, hostingModel);

        // When
        using var dotNetPublish = XProcess.Start(
            "dotnet", $"publish -c Release", workingDirectory: context.HostProjectDir);
        await dotNetPublish.WaitForExitAsync();
        dotNetPublish.ExitCode.Is(0, message: dotNetPublish.Output);

        var publishDir = Path.Combine(context.HostProjectDir, "bin", "Release", targetFramework, "publish", "wwwroot");

        // Then 1: There is no content files for the FIndRazorSourceFile, such as JavaScript module or CSS.
        var findRazorSourceFileContentDir = Path.Combine(publishDir, "_content", "FindRazorSourceFile");
        Directory.Exists(findRazorSourceFileContentDir).IsFalse(message: $"The content directory {findRazorSourceFileContentDir} should not exist after publish.");

        // Then 2: There is no configuration to load the FindRazorSourceFile module in the published app.
        if (hostingModel == "Server")
        {
            var moduleJsonPath = Path.Combine(publishDir, "SampleSite.Server.modules.json");
            var moduleJson = File.Exists(moduleJsonPath)
                ? (Nullable<JsonElement>)JsonSerializer.Deserialize<JsonElement>(File.ReadAllText(moduleJsonPath))
                : null;
            moduleJson.EnumerateTextArray().Any(path => Regex.IsMatch(path, @"^_content/FindRazorSourceFile/FindRazorSourceFile\.[a-zA-Z0-9]+\.lib\.module\.js$"))
                .IsFalse(message: $"The module file for FindRazorSourceFile should not exist in {moduleJsonPath} after publish.");
        }
        else
        {
            var blazorBootJson = BlazorBootJson.Read(publishDir, out var blazorBootJsonPath);
            var libraryInitializers = blazorBootJson.GetObject("resources").GetObject("libraryInitializers");
            libraryInitializers.EnumerateObject().Any(prop => Regex.IsMatch(prop.Name, @"^_content/FindRazorSourceFile/FindRazorSourceFile\.[a-zA-Z0-9]+\.lib\.module\.js$"))
                .IsFalse(message: $"The library initializer for FindRazorSourceFile should not exist in {blazorBootJsonPath} after publish.");
        }
    }

    [TestCaseSource(typeof(FindRazorSourceFileTest), nameof(TestCases))]
    public async Task DotNetBuild_with_CustomPath_Test(string targetFramework, string hostingModel)
    {
        // Given
        using var context = new BuildTestContext(targetFramework, hostingModel);
        using var workFolder = new WorkDirectory();
        File.WriteAllText(Path.Combine(context.WorkFolder, "Directory.Build.props"), $"""
            <Project>
                <PropertyGroup>
                    <BaseOutputPath>{workFolder}\$(MSBuildProjectName)\bin\</BaseOutputPath>
                    <BaseIntermediateOutputPath>{workFolder}\$(MSBuildProjectName)\obj\</BaseIntermediateOutputPath>
                </PropertyGroup>
            </Project>
            """);

        // When
        using var buildProcess = XProcess.Start("dotnet", "build", workingDirectory: context.HostProjectDir);
        await buildProcess.WaitForExitAsync();

        // Then
        buildProcess.ExitCode.Is(0, message: buildProcess.Output);
    }
}