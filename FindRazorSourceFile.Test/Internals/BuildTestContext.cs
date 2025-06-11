using System.Text.RegularExpressions;
using Toolbelt;

namespace FindRazorSourceFile.Test.Internals;

public class BuildTestContext : IDisposable
{
    private readonly WorkDirectory _WorkFolder;

    public string HostingModel { get; }

    public string SecondaryHostModel { get; }

    public string HostProjectDir { get; }

    public string SecondaryHostProjectDir { get; }

    public string ComponentProjectDir { get; }

    public string MapFilesDirOfHost { get; }

    /// <summary>ex: "C:\...\SampleSites\net9.0\Components\obj\Debug\net9.0\RazorSourceMapFiles\"</summary>
    public string MapFilesDirOfComponent { get; }

    public string MapFilesDirOfSecondaryHost { get; }

    private static string PathOf(string pathString) => Path.Combine(pathString.Split('/'));

    public BuildTestContext(string framework, string hostingModel)
    {
        var solutionDir = FileIO.FindContainerDirToAncestor("FindRazorSourceFile.sln");
        var sampleSitesDir = Path.Combine(solutionDir, "SampleSites", framework);
        this._WorkFolder = WorkDirectory.CreateCopyFrom(sampleSitesDir, args => args.Name is not "bin" and not "obj" and not ".vs");

        var m = Regex.Match(hostingModel, @"^(?<primary>[^\(]+)(\((?<secondary>[^\)]+)\))?$", RegexOptions.IgnoreCase);
        this.HostingModel = m.Groups["primary"].Value;
        this.SecondaryHostModel = m.Groups["secondary"].Value;
        this.HostProjectDir = Path.Combine(this._WorkFolder, this.HostingModel);
        this.SecondaryHostProjectDir = string.IsNullOrEmpty(this.SecondaryHostModel)
            ? ""
            : Path.Combine(this._WorkFolder, this.SecondaryHostModel);
        this.ComponentProjectDir = Path.Combine(this._WorkFolder, "Components");
        this.MapFilesDirOfHost = Path.Combine(this.HostProjectDir, PathOf($"obj/Debug/{framework}/RazorSourceMapFiles")) + Path.DirectorySeparatorChar;
        this.MapFilesDirOfComponent = Path.Combine(this.ComponentProjectDir, PathOf($"obj/Debug/{framework}/RazorSourceMapFiles")) + Path.DirectorySeparatorChar;
        this.MapFilesDirOfSecondaryHost = string.IsNullOrEmpty(this.SecondaryHostModel)
            ? ""
            : Path.Combine(this._WorkFolder, this.SecondaryHostModel, PathOf($"obj/Debug/{framework}/RazorSourceMapFiles")) + Path.DirectorySeparatorChar;
    }

    public void Dispose()
    {
        this._WorkFolder.Dispose();
    }
}
