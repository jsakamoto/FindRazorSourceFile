using System.Collections.Generic;
using System.IO;
using System.Linq;
using EnvDTE;
using EnvDTE80;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Web.BrowserLink;
using static System.Linq.Enumerable;

namespace FindRazorSourceFile.VisualStudioExtension
{
    public class FindRazorSourceFileBrowserLinkInstance : BrowserLinkExtension
    {
        private static DTE2 DTE
        {
            get
            {
                ThreadHelper.ThrowIfNotOnUIThread();
                return ServiceProvider.GlobalProvider.GetService(typeof(DTE)) as DTE2;
            }
        }

        public override IEnumerable<BrowserLinkAction> Actions => Empty<BrowserLinkAction>();

        [BrowserLinkCallback]
        public void Razorsource_OnLockIn(string projectName, string itemName)
        {
            ThreadHelper.ThrowIfNotOnUIThread();

            var allItems = EnumProjectItems(DTE.Solution.OfType<Project>()).ToArray();

            var targetItem = EnumProjectItems(DTE.Solution.OfType<Project>())
                .FirstOrDefault(item => item.ProjectName == projectName && item.ItemName == itemName);
            if (targetItem != null)
            {
                DTE.MainWindow.Activate();

                var projectItem = targetItem.Object;
                if (!projectItem.IsOpen) projectItem.Open();
                projectItem.Document.Activate();
            }
        }

        private static IEnumerable<NamedProjectItem> EnumProjectItems(IEnumerable<Project> projects)
        {
            foreach (var project in projects)
            {
                ThreadHelper.ThrowIfNotOnUIThread();
                foreach (var item in EnumProjectItems(project))
                {
                    yield return item;
                }
            }
        }

        private static IEnumerable<NamedProjectItem> EnumProjectItems(Project project)
        {
            ThreadHelper.ThrowIfNotOnUIThread();
            var projectName = project.Name;
            foreach (var item in project.ProjectItems.OfType<ProjectItem>())
            {
                foreach (var subItem in EnumProjectItems(projectName, "", item))
                {
                    yield return subItem;
                }
            }
        }

        private static IEnumerable<NamedProjectItem> EnumProjectItems(string projectName, string containerName, ProjectItem projectItem)
        {
            ThreadHelper.ThrowIfNotOnUIThread();
            if (projectItem.Object is Project project)
            {
                foreach (var item in EnumProjectItems(project))
                {
                    yield return item;
                }
            }
            else
            {
                var projectItemIsFile = projectItem.Kind == "{6BB5F8EE-4483-11D3-8BCF-00C04F8EC28C}";
                if (projectItemIsFile)
                {
                    yield return new NamedProjectItem(projectName, containerName, projectItem);
                }

                foreach (var item in (projectItem.ProjectItems?.OfType<ProjectItem>() ?? Empty<ProjectItem>()))
                {
                    var subContainerName = Path.Combine(containerName, projectItemIsFile ? "" : projectItem.Name);
                    foreach (var subItem in EnumProjectItems(projectName, subContainerName, item))
                    {
                        yield return subItem;
                    }
                }
            }
        }
    }
}
