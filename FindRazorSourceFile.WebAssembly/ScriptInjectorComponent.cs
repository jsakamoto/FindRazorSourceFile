using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace FindRazorSourceFile.WebAssembly;

public class ScriptInjectorComponent : ComponentBase, IAsyncDisposable
{
    [Inject] private IJSRuntime _JS { get; init; } = null!;

    private IJSObjectReference? _Script;

    public ScriptInjectorComponent()
    {
    }

    protected override async Task OnInitializedAsync()
    {
        this._Script = await this._JS.InvokeAsync<IJSObjectReference>("import", "./_content/FindRazorSourceFile/script.min.js");
        if (this._Script == null) return;
        await this._Script.InvokeVoidAsync("init");
    }

    public async ValueTask DisposeAsync()
    {
        if (this._Script != null) await this._Script.DisposeAsync();
    }
}
