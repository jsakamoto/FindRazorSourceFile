using System.IO;
using EnvDTE;
using Microsoft.VisualStudio.Shell;

namespace FindRazorSourceFile.VisualStudioExtension
{
    public class NamedProjectItem
    {
        public string ProjectName { get; }

        public string ItemName { get; }

        public ProjectItem Object { get; }

        public NamedProjectItem(string projectName, string containerName, ProjectItem projectItem)
        {
            ThreadHelper.ThrowIfNotOnUIThread();

            this.ProjectName = projectName;
            this.ItemName = Path.Combine(containerName, projectItem.Name);
            this.Object = projectItem;
        }

        public override string ToString() => $"{this.ProjectName} | {this.ItemName}";
    }
}
