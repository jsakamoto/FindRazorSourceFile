using NUnit.Framework;

namespace FindRazorSourceFile.Test.Internals;

public class BuildTestContext : IDisposable
{
    private readonly WorkFolder _WorkFolder;

    /// <summary>ex: "C:\...\FindRazorSourceFile.Test\bin\Debug\net5.0\111...1\"</summary>
    public string OutputDir { get; }

    public string HostingModel { get; }

    public string HostProjectDir { get; }

    public string ComponentProjectDir { get; }

    public string StaticWebAssetsXmlPath { get; }

    // TODO: Temporary, this test does not work. It depends on the version of the .NET SDK.
    //public string StaticWebAssetsJsonPath { get; }

    public string StaticWebAssetsRuntimeJsonPath { get; }

    public string MapFilesDirOfHost { get; }

    /// <summary>ex: "C:\...\SampleSites\net9.0\Components\obj\Debug\net9.0\RazorSourceMapFiles\"</summary>
    public string MapFilesDirOfComponent { get; }

    private static string PathOf(string pathString) => Path.Combine(pathString.Split('/'));

    public BuildTestContext(string hostingModel, string framework)
    {
        this._WorkFolder = new WorkFolder();
        this.HostingModel = hostingModel;
        this.OutputDir = this._WorkFolder + Path.DirectorySeparatorChar;
        this.HostProjectDir = Path.Combine(WorkFolder.SolutionDir, "SampleSites", framework, hostingModel);
        this.ComponentProjectDir = Path.Combine(WorkFolder.SolutionDir, "SampleSites", framework, "Components");
        this.MapFilesDirOfHost = Path.Combine(WorkFolder.SolutionDir, PathOf($"SampleSites/{framework}/{hostingModel}/obj/Debug/{framework}/RazorSourceMapFiles")) + Path.DirectorySeparatorChar;
        this.MapFilesDirOfComponent = Path.Combine(WorkFolder.SolutionDir, PathOf($"SampleSites/{framework}/Components/obj/Debug/{framework}/RazorSourceMapFiles")) + Path.DirectorySeparatorChar;

        this.StaticWebAssetsXmlPath = Path.Combine(this.OutputDir, $"SampleSite.{hostingModel}.StaticWebAssets.xml");

        // TODO: Temporary, this test does not work. It depends on the version of the .NET SDK.
        //this.StaticWebAssetsJsonPath = Path.Combine(this.OutputDir, $"SampleSite.{hostingModel}.staticwebassets.json");

        this.StaticWebAssetsRuntimeJsonPath = Path.Combine(this.OutputDir, $"SampleSite.{hostingModel}.staticwebassets.runtime.json");

        if (Directory.Exists(this.MapFilesDirOfHost)) Directory.Delete(this.MapFilesDirOfHost, recursive: true);
        Directory.Exists(this.MapFilesDirOfHost).IsFalse();
        if (Directory.Exists(this.MapFilesDirOfComponent)) Directory.Delete(this.MapFilesDirOfComponent, recursive: true);
        Directory.Exists(this.MapFilesDirOfComponent).IsFalse();
    }

    public void Dispose()
    {
        this._WorkFolder.Dispose();
    }
}
