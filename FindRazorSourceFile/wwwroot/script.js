const NotFound = 'NotFound';
var elements;
var lastDetectedRazorSource = null;
var currentScope = null;
var currentScopeRect = null;
const razorSourceMap = {};
var currentMode = 0 /* Inactive */;
export function init(name) {
    elements = createElements();
    updateUIeffects(1 /* Active */);
    elements.overlay.addEventListener('mousemove', ev => overlay_onMouseMove(ev));
    elements.overlay.addEventListener('click', ev => overlay_onClick(ev));
    elements.sourceNameTip.addEventListener('mousemove', ev => ev.stopPropagation());
    elements.sourceNameTip.addEventListener('click', ev => sourceNameTip_onClick(ev));
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
    overlay.style.borderStyle = 'solid';
    overlay.style.transition = 'border 0.2s ease-out, box-shadow 0.2s ease-out, opacity 0.2s linear';
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
    sourceNameTip.style.transition = 'opacity 0.2s ease-out';
    overlay.appendChild(sourceNameTip);
    return { overlay, sourceNameTip };
}
function updateUIeffects(mode) {
    const overlayOpacity = mode === 1 /* Active */ ? 0.3 : 0.5;
    const sourcetipOpacity = mode === 1 /* Active */ ? '0.8' : '1.0';
    elements.overlay.style.borderColor = `rgba(0, 0, 0, ${overlayOpacity})`;
    elements.overlay.style.boxShadow = `inset rgb(0, 0, 0, ${overlayOpacity}) 0px 0px 6px 4px`;
    elements.sourceNameTip.style.opacity = sourcetipOpacity;
}
function onKeyDown(ev) {
    if (currentMode === 0 /* Inactive */ && ev.code === 'KeyF' && ev.ctrlKey && ev.shiftKey && !ev.metaKey && !ev.altKey) {
        ev.stopPropagation();
        ev.preventDefault();
        currentMode = 1 /* Active */;
        elements.overlay.style.borderWidth = '50vh 50vw';
        elements.overlay.style.display = 'block';
        setTimeout(() => { if (currentMode === 1 /* Active */ || currentMode === 2 /* Locked */)
            elements.overlay.style.opacity = '1'; }, 1);
        elements.sourceNameTip.textContent = '';
        currentScope = null;
        currentScopeRect = null;
    }
    else if ((currentMode === 1 /* Active */ || currentMode === 2 /* Locked */) && ev.code === 'Escape' && !ev.ctrlKey && !ev.shiftKey && !ev.metaKey && !ev.altKey) {
        ev.stopPropagation();
        ev.preventDefault();
        currentMode = currentMode === 2 /* Locked */ ? 1 /* Active */ : 0 /* Inactive */;
        updateUIeffects(1 /* Active */);
        elements.sourceNameTip.style.display = 'none';
        elements.overlay.style.borderWidth = '50vh 50vw';
        if (currentMode === 0 /* Inactive */) {
            elements.overlay.style.opacity = '0';
            setTimeout(() => { if (currentMode === 0 /* Inactive */)
                elements.overlay.style.display = 'none'; }, 200);
        }
    }
}
async function overlay_onMouseMove(ev) {
    if (currentMode !== 1 /* Active */)
        return;
    detectTargetAndDisplayIt(ev);
}
function overlay_onClick(ev) {
    if (currentMode === 1 /* Active */) {
        if (currentScope !== null && lastDetectedRazorSource !== null && lastDetectedRazorSource !== NotFound) {
            currentMode = 2 /* Locked */;
            updateUIeffects(2 /* Locked */);
            const event = new Event("razorsource:lockin" /* LockIn */, { bubbles: false, cancelable: false });
            event.razorSourceName = lastDetectedRazorSource;
            document.dispatchEvent(event);
        }
    }
    else if (currentMode === 2 /* Locked */) {
        currentMode = 1 /* Active */;
        updateUIeffects(1 /* Active */);
        detectTargetAndDisplayIt(ev);
    }
}
function sourceNameTip_onClick(ev) {
    ev.stopPropagation();
    if (currentMode === 1 /* Active */) {
        overlay_onClick(ev);
    }
}
async function detectTargetAndDisplayIt(ev) {
    const result = detectScope(ev);
    if (result.scopeHasChanged === false)
        return;
    lastDetectedRazorSource = await getRazorSourceName(result.scope);
    displayScopeMask(result.scopeRect, lastDetectedRazorSource);
}
function detectScope(ev) {
    elements.overlay.style.visibility = 'hidden';
    const hovered = document.elementFromPoint(ev.clientX, ev.clientY);
    elements.overlay.style.visibility = 'visible';
    let scope = null;
    for (var nearestTarget = hovered; nearestTarget !== null; nearestTarget = nearestTarget.parentElement) {
        scope = getScope(nearestTarget);
        if (scope !== null)
            break;
    }
    let nextScopeRect = null;
    // if scope not found, re-check the mouse cursor is in current rect, and if it's true then keep current scope.
    if (scope === null) {
        if (currentScopeRect !== null) {
            if (currentScopeRect.left < ev.clientX && ev.clientX < currentScopeRect.right &&
                currentScopeRect.top < ev.clientY && ev.clientY < currentScopeRect.bottom) {
                return { scope: currentScope, scopeRect: currentScopeRect, scopeHasChanged: false };
            }
        }
    }
    // else, next scope is found and current scope is also available...
    else if (currentScope !== null && currentScope !== scope && currentScopeRect !== null) {
        // ...and the mouse cursor is still in the current rect...
        if (currentScopeRect.left < ev.clientX && ev.clientX < currentScopeRect.right &&
            currentScopeRect.top < ev.clientY && ev.clientY < currentScopeRect.bottom) {
            // if the current rect is included the next rect, then keep current scope.
            nextScopeRect = getScopeRect(scope);
            if (nextScopeRect.left < currentScopeRect.left &&
                nextScopeRect.right > currentScopeRect.right &&
                nextScopeRect.top < currentScopeRect.top &&
                nextScopeRect.bottom > currentScopeRect.bottom) {
                return { scope: currentScope, scopeRect: currentScopeRect, scopeHasChanged: false };
            }
        }
    }
    const scopeHasChanged = currentScope !== scope;
    if (scopeHasChanged) {
        currentScope = scope;
        currentScopeRect = scope == null ? null : (nextScopeRect !== null ? nextScopeRect : getScopeRect(scope));
    }
    return { scope: currentScope, scopeRect: currentScopeRect, scopeHasChanged };
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
        const p = text.replace(/[\r\n]*$/ig, '').split('|');
        const razorSourceName = { projectName: p[0], itemName: p[1] };
        razorSourceMap[scope] = razorSourceName;
        return razorSourceName;
    }
    else {
        razorSourceMap[scope] = NotFound;
        return NotFound;
    }
}
function displayScopeMask(scopeRect, razorSourceName) {
    if (scopeRect === null || razorSourceName === null || razorSourceName === NotFound) {
        elements.sourceNameTip.style.display = 'none';
        elements.overlay.style.borderWidth = '50vh 50vw';
        return;
    }
    const overlayRect = elements.overlay.getBoundingClientRect();
    elements.overlay.style.borderStyle = 'solid';
    elements.overlay.style.borderTopWidth = scopeRect.top + 'px';
    elements.overlay.style.borderLeftWidth = scopeRect.left + 'px';
    elements.overlay.style.borderBottomWidth = (overlayRect.height - scopeRect.bottom) + 'px';
    elements.overlay.style.borderRightWidth = (overlayRect.width - scopeRect.right) + 'px';
    elements.sourceNameTip.textContent = `${razorSourceName.projectName} | ${razorSourceName.itemName}`;
    elements.sourceNameTip.style.display = 'block';
}
function getScopeRect(scope) {
    const scopeRect = { top: 9999999, left: 9999999, bottom: 0, right: 0 };
    if (scope !== null) {
        const allElementsInScope = document.body.querySelectorAll(`*[${scope}]`);
        allElementsInScope.forEach(e => {
            const rect = e.getBoundingClientRect();
            scopeRect.top = Math.min(scopeRect.top, rect.top);
            scopeRect.left = Math.min(scopeRect.left, rect.left);
            scopeRect.bottom = Math.max(scopeRect.bottom, rect.bottom);
            scopeRect.right = Math.max(scopeRect.right, rect.right);
        });
    }
    return scopeRect;
}
