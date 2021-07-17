using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace FindRazorSourceFile.WebAssembly
{
    public class ScriptInjectorComponent : ComponentBase, IAsyncDisposable
    {
        [Inject] private IJSRuntime _JS { get; init; } = null!;

        private IJSObjectReference? _Script;

        public ScriptInjectorComponent()
        {
        }

        protected override async Task OnInitializedAsync()
        {
            _Script = await _JS.InvokeAsync<IJSObjectReference>("import", "./_content/FindRazorSourceFile/script.js");
            Console.WriteLine($"ScriptInjectorComponent: OnInitialized! [{(_Script != null)}]");

            if (_Script == null) return;

            await _Script.InvokeVoidAsync("init", "Taro");
        }

        public async ValueTask DisposeAsync()
        {
            if (_Script != null) await _Script.DisposeAsync();
        }
    }
}
