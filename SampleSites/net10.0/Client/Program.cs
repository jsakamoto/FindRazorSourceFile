using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using SampleSite.Client.Services;
using SampleSite.Components.Services;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
var standalone = Environment.GetEnvironmentVariable("STANDALONE")?.ToLower() == "true";
Console.WriteLine($"[CONFIG] STANDALONE = {standalone}");
if (standalone)
{
    builder.RootComponents.Add<SampleSite.Components.App>("#app");
    builder.RootComponents.Add<HeadOutlet>("head::after");
}

builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });
builder.Services.AddScoped<IWeatherForecastService, WeatherForecastService>();

await builder.Build().RunAsync();
