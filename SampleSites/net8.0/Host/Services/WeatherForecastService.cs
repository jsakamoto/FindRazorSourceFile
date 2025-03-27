using SampleSite.Components.Services;

namespace SampleSite.Host.Services;

public class DummyWeatherForecastService : IWeatherForecastService
{
    public Task<WeatherForecast[]> GetForecastAsync() => Task.FromResult(Array.Empty<WeatherForecast>());
}
