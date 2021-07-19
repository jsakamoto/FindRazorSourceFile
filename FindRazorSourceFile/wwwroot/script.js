const NotFound = 'NotFound';
var elements;
var lastHovered = null;
var lastDetectedTarget = null;
var lastDetectedScope = null;
const razorSourceMap = {};
var currentMode = 0 /* Inactive */;
export function init(name) {
    elements = createElements();
    elements.overlay.addEventListener('mousemove', ev => overlay_onMouseMove(ev));
    elements.overlay.addEventListener('click', ev => overlay_onClick(ev));
    elements.sourceNameTip.addEventListener('mousemove', ev => ev.stopPropagation());
    elements.sourceNameTip.addEventListener('click', ev => ev.stopPropagation());
    document.addEventListener('keydown', ev => onKeyDown(ev));
}
function createElements() {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.bottom = '0';
    overlay.style.right = '0';
    overlay.style.zIndex = '9999';
    overlay.style.backgroundColor = 'transparent';
    overlay.style.borderColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.borderStyle = 'solid';
    overlay.style.boxShadow = 'inset rgb(0, 0, 0, 0.7) 0px 0px 6px 4px';
    overlay.style.transition = 'border-width 0.1s linear, opacity 0.2s linear';
    overlay.style.display = 'none';
    overlay.style.opacity = '0';
    document.body.appendChild(overlay);
    const sourceNameTip = document.createElement('div');
    sourceNameTip.style.position = 'absolute';
    sourceNameTip.style.top = '4px';
    sourceNameTip.style.left = '4px';
    sourceNameTip.style.color = '#111';
    sourceNameTip.style.fontFamily = 'sans-serif';
    sourceNameTip.style.fontSize = '12px';
    sourceNameTip.style.padding = '2px 6px';
    sourceNameTip.style.backgroundColor = '#ffc107';
    sourceNameTip.style.boxShadow = '2px 2px 4px 0px rgb(0, 0, 0, 0.5)';
    sourceNameTip.style.whiteSpace = 'nowrap';
    sourceNameTip.style.display = 'none';
    overlay.appendChild(sourceNameTip);
    return { overlay, sourceNameTip };
}
function onKeyDown(ev) {
    console.log(ev);
    if (currentMode === 0 /* Inactive */ && ev.code === 'KeyF' && ev.ctrlKey && ev.shiftKey && !ev.metaKey && !ev.altKey) {
        ev.stopPropagation();
        ev.preventDefault();
        currentMode = 1 /* Active */;
        elements.overlay.style.borderWidth = '50vh 50vw';
        elements.overlay.style.display = 'block';
        setTimeout(() => { if (currentMode === 1 /* Active */ || currentMode === 2 /* Locked */)
            elements.overlay.style.opacity = '1'; }, 1);
        elements.sourceNameTip.textContent = '';
        lastHovered = null;
        lastDetectedTarget = null;
        lastDetectedScope = null;
    }
    else if ((currentMode === 1 /* Active */ || currentMode === 2 /* Locked */) && ev.code === 'Escape' && !ev.ctrlKey && !ev.shiftKey && !ev.metaKey && !ev.altKey) {
        ev.stopPropagation();
        ev.preventDefault();
        currentMode = 0 /* Inactive */;
        elements.sourceNameTip.style.display = 'none';
        elements.overlay.style.borderWidth = '50vh 50vw';
        elements.overlay.style.opacity = '0';
        setTimeout(() => { if (currentMode === 0 /* Inactive */)
            elements.overlay.style.display = 'none'; }, 200);
    }
}
async function overlay_onMouseMove(ev) {
    if (currentMode !== 1 /* Active */)
        return;
    detectTargetAndDisplayIt(ev);
}
function overlay_onClick(ev) {
    if (currentMode === 1 /* Active */) {
        if (lastDetectedTarget !== null && lastDetectedScope !== null) {
            currentMode = 2 /* Locked */;
        }
    }
    else if (currentMode === 2 /* Locked */) {
        currentMode = 1 /* Active */;
        detectTargetAndDisplayIt(ev);
    }
}
async function detectTargetAndDisplayIt(ev) {
    const result = detectTarget(ev);
    if (result.targetHasChanged === false)
        return;
    const razorSourceName = await getRazorSourceName(result.scope);
    displayTargetMask(result.target, razorSourceName);
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
async function getRazorSourceName(scope) {
    if (scope === null)
        return null;
    let razorSourceName = razorSourceMap[scope] || null;
    if (razorSourceName !== null)
        return razorSourceName;
    const res = await fetch(`_content/FindRazorSourceFile/RazorSourceMapFiles/${scope}.txt`);
    if (res.ok) {
        const text = await res.text();
        console.log(text);
        const p = text.split('|');
        const razorSourceName = { projectName: p[0], itemName: p[1] };
        razorSourceMap[scope] = razorSourceName;
        return razorSourceName;
    }
    else {
        razorSourceMap[scope] = NotFound;
        return NotFound;
    }
}
function displayTargetMask(target, razorSourceName) {
    if (target === null || razorSourceName === null || razorSourceName === NotFound) {
        elements.sourceNameTip.style.display = 'none';
        elements.overlay.style.borderWidth = '50vh 50vw';
        return;
    }
    const overlayRect = elements.overlay.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    elements.overlay.style.borderStyle = 'solid';
    elements.overlay.style.borderTopWidth = targetRect.top + 'px';
    elements.overlay.style.borderLeftWidth = targetRect.left + 'px';
    elements.overlay.style.borderBottomWidth = (overlayRect.height - targetRect.bottom) + 'px';
    elements.overlay.style.borderRightWidth = (overlayRect.width - targetRect.right) + 'px';
    elements.sourceNameTip.textContent = `${razorSourceName.projectName} | ${razorSourceName.itemName}`;
    elements.sourceNameTip.style.display = 'block';
}
