using System.Net.NetworkInformation;

namespace FindRazorSourceFile.Test.Internals;

internal static class NetworkTool
{
    private static int _Port = 5000; // Starting port number for the server

    public static int GetAvailableTcpPort()
    {
        while (true)
        {
            var port = Interlocked.Increment(ref _Port);
            var ipProps = IPGlobalProperties.GetIPGlobalProperties();
            if (ipProps.GetActiveTcpConnections().Any(conn => conn.LocalEndPoint.Port == port)) continue;
            if (ipProps.GetActiveTcpListeners().Any(ep => ep.Port == port)) continue;
            return port;
        }
    }
}
