var elements;
var lastHovered = null;
var lastDetectedTarget = null;
var lastDetectedScope = null;
const razorSourceMap = {};
export function init(name) {
    elements = createElements();
    elements.overlay.addEventListener('mousemove', ev => overlay_onMouseMove(ev));
}
function createElements() {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.bottom = '0';
    overlay.style.right = '0';
    overlay.style.zIndex = '9999';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0)';
    //overlay.style.opacity = '0.5';
    //overlay.style.border = 'solid 2px red';
    document.body.appendChild(overlay);
    const targetMask = document.createElement('div');
    targetMask.style.position = 'absolute';
    targetMask.style.top = '0';
    targetMask.style.left = '0';
    targetMask.style.width = '0';
    targetMask.style.height = '0';
    //targetMask.style.zIndex = '9999';
    targetMask.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    //targetMask.style.opacity = '0.5';
    targetMask.style.outline = 'solid 2px cyan';
    overlay.appendChild(targetMask);
    return { overlay, targetMask };
}
function overlay_onMouseMove(ev) {
    const result = detectTarget(ev);
    if (result.targetHasChanged === false)
        return;
    console.log(result);
    if (result.target !== null && result.scope !== null) {
        const scope = result.scope;
        let razorSourceName = razorSourceMap[result.scope] || null;
        if (razorSourceName !== null) {
            displayTargetMask(result.target, razorSourceName);
            return;
        }
        fetch(`_content/FindRazorSourceFile/RazorSourceMapFiles/${scope}.txt`)
            .then(res => {
            if (res.ok) {
                res.text().then(text => {
                    console.log(text);
                    razorSourceMap[scope] = text;
                    displayTargetMask(result.target, text);
                });
            }
        });
    }
    else {
        displayTargetMask(result.target, null);
    }
}
function detectTarget(ev) {
    elements.overlay.style.visibility = 'hidden';
    const hovered = document.elementFromPoint(ev.clientX, ev.clientY);
    elements.overlay.style.visibility = 'visible';
    if (hovered === lastHovered)
        return { target: lastDetectedTarget, scope: lastDetectedScope, targetHasChanged: false };
    lastHovered = hovered;
    let scope = null;
    let target = null;
    for (var nearestTarget = hovered; nearestTarget !== null; nearestTarget = nearestTarget.parentElement) {
        scope = getScope(nearestTarget);
        if (scope !== null)
            break;
    }
    if (nearestTarget != null && scope !== null) {
        target = nearestTarget;
        for (var t = nearestTarget.parentElement; t !== null; t = t.parentElement) {
            const parentScope = getScope(t);
            if (parentScope === null)
                continue;
            if (parentScope !== scope)
                break;
            target = t;
        }
    }
    const targetHasChanged = lastDetectedTarget !== target;
    lastDetectedTarget = target;
    lastDetectedScope = target === null ? null : scope;
    return { target: lastDetectedTarget, scope: lastDetectedScope, targetHasChanged };
}
function getScope(element) {
    return element.getAttributeNames().filter(name => name.startsWith('b-'))[0] || null;
}
function displayTargetMask(target, razorSourceName) {
    if (target === null || razorSourceName === null) {
        elements.targetMask.style.display = 'none';
        return;
    }
    const rect = target.getBoundingClientRect();
    elements.targetMask.style.top = rect.top + 'px';
    elements.targetMask.style.left = rect.left + 'px';
    elements.targetMask.style.width = rect.width + 'px';
    elements.targetMask.style.height = rect.height + 'px';
    elements.targetMask.style.display = 'block';
}
