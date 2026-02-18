## Find Razor Source File Configuration

### Overview

You can provide configuration for Find Razor Source File by specifying `FindRazorSourceFileConfig` items in your Blazor application project file. Each configuration entry is represented as a "key" and "value" pair.

```xml
<ItemGroup>
  <FindRazorSourceFileConfig Include="key1" Value="value1" />
  <FindRazorSourceFileConfig Include="key2" Value="value2" />
</ItemGroup>
```

### Hotkey Configuration

The hotkey to activate Find Razor Source File can be customized using the following configuration keys.

Configuration Key   | Description                                          | Default Value
------------------- | ---------------------------------------------------- | ---
`hotkey:code`       | The code property of the JavaScript keydown event    | "KeyF"
`hotkey:ctrlKey`    | The ctrlKey property of the JavaScript keydown event | true
`hotkey:shiftKey`   | The shiftKey property of the JavaScript keydown event| true
`hotkey:altKey`     | The altKey property of the JavaScript keydown event  | false
`hotkey:metaKey`    | The metaKey property of the JavaScript keydown event | false

### Internal Implementation of Configuration

The MSBuild script included in the Find Razor Source File NuGet package converts the `FindRazorSourceFileConfig` items in the project file into the following JSON format, which is then made available at the URL "./FindRazorSourceFileConfig.json".

In other words, an HTTP GET request to "./FindRazorSourceFileConfig.json" returns the Find Razor Source File configuration as JSON in the following format:

```json
[
    {"key":"key1","value":"value1"},
    {"key":"key2","value":"value2"}
]
```

The client-side implementation of Find Razor Source File fetches "./FindRazorSourceFileConfig.json" to retrieve the configuration and uses it for hotkey detection and other purposes.
