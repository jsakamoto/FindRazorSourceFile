(function (browserLink) {
    document.addEventListener('razorsource:lockin', razorsource_onlockin)

    function razorsource_onlockin(ev) {
        const projectName = ev.razorSourceName.projectName;
        const itemName = ev.razorSourceName.itemName;
        browserLink.invoke("Razorsource_OnLockIn", projectName, itemName);
    }

    return {};
});
