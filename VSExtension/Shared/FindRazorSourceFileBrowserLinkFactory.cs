using System.ComponentModel.Composition;
using System.IO;
using Microsoft.VisualStudio.Web.BrowserLink;

namespace FindRazorSourceFile.VisualStudioExtension
{
    [Export(typeof(IBrowserLinkExtensionFactory))]
    public class FindRazorSourceFileBrowserLinkFactory : IBrowserLinkExtensionFactory
    {
        public BrowserLinkExtension CreateExtensionInstance(BrowserLinkConnection connection)
        {
            return new FindRazorSourceFileBrowserLinkInstance();
        }

        public string GetScript()
        {
            using (var stream = this.GetType().Assembly.GetManifestResourceStream("FindRazorSourceFile.VisualStudioExtension.FindRazorSourceFileBrowserLink.js"))
            using (var reader = new StreamReader(stream))
            {
                return reader.ReadToEnd();
            }
        }
    }
}
