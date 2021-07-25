using System;
using System.IO;
using NUnit.Framework;

namespace FindRazorSourceFile.Test.Internals
{
    public class BuildTestContext : IDisposable
    {
        private readonly WorkFolder _WorkFolder;

        public string OutputDir { get; }

        public string HostProjectDir { get; }

        public string StaticWebAssetsMetaPath { get; }

        public string MapFilesDirOfHost { get; }

        public string MapFilesDirOfComponent { get; }

        private static string PathOf(string pathString) => Path.Combine(pathString.Split('/'));

        public BuildTestContext(string hostingModel)
        {
            this._WorkFolder = new WorkFolder();
            this.OutputDir = this._WorkFolder;
            this.HostProjectDir = Path.Combine(WorkFolder.SolutionDir, "SampleSites", hostingModel);
            this.StaticWebAssetsMetaPath = Path.Combine(this.OutputDir, $"SampleSite.{hostingModel}.StaticWebAssets.xml");
            this.MapFilesDirOfHost = Path.Combine(WorkFolder.SolutionDir, PathOf($"SampleSites/{hostingModel}/obj/Debug/net5.0/RazorSourceMapFiles")) + Path.DirectorySeparatorChar;
            this.MapFilesDirOfComponent = Path.Combine(WorkFolder.SolutionDir, PathOf("SampleSites/Components/obj/Debug/net5.0/RazorSourceMapFiles")) + Path.DirectorySeparatorChar;

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
}
