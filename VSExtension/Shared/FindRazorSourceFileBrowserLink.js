(function (browserLink) {
    document.addEventListener('razorsource:lockin', razorsource_onlockin)

    function razorsource_onlockin(ev) {
        const projectName = ev.razorSourceName.projectName;
        const itemName = ev.razorSourceName.itemName;
        setTimeout(() => {
            browserLink.invoke("Razorsource_OnLockIn", projectName, itemName);
        }, 100);
    }

    return {};
});
