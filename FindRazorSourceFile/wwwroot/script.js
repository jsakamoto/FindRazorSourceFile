const NotFound = 'NotFound';
var elements;
var lastDetectedRazorSource = null;
var currentScope = null;
var currentScopeRect = null;
const razorSourceMap = {};
var currentMode = 0 /* Inactive */;
var options = {
    openInVSCode: false
};
const FindRazorSourceFileClientOptionsKey = 'razorsource:options';
export function init(name) {
    elements = createElements();
    updateUIeffects(1 /* Active */);
    elements.overlay.addEventListener('mousemove', ev => overlay_onMouseMove(ev));
    elements.overlay.addEventListener('click', ev => overlay_onClick(ev));
    elements.sourceNameTip.addEventListener('mousemove', ev => ev.stopPropagation());
    elements.sourceNameTip.addEventListener('click', ev => sourceNameTip_onClick(ev));
    elements.settingsButton.addEventListener('click', ev => settingsButton_onClick(ev));
    elements.settingsForm.addEventListener('click', ev => ev.stopPropagation());
    elements.settingsOpenInVSCode.addEventListener('click', ev => settingsOpenInVSCode_onClick(ev));
    document.addEventListener('keydown', ev => onKeyDown(ev));
    window.addEventListener('resize', ev => window_onResize(ev));
    window.addEventListener('storage', ev => window_onStorage(ev));
    loadOptionsFromLocalStorage();
}
function createElements() {
    function createElement(tagName, style, attrib) {
        const element = document.createElement(tagName);
        if (style !== null) {
            Object.assign(element.style, style);
        }
        if (typeof (attrib) !== 'undefined' && attrib !== null) {
            Object.assign(element, attrib);
        }
        return element;
    }
    const overlay = createElement('div', {
        position: 'fixed', top: '0', left: '0', bottom: '0', right: '0', zIndex: '9999',
        backgroundColor: 'transparent', borderStyle: 'solid', display: 'none', opacity: '0',
        transition: 'border 0.2s ease-out, box-shadow 0.2s ease-out, opacity 0.2s linear'
    });
    document.body.appendChild(overlay);
    const sourceNameTip = createElement('div', {
        position: 'absolute', top: '4px', left: '4px', padding: '2px 6px',
        fontFamily: 'sans-serif', fontSize: '12px', color: '#111',
        backgroundColor: '#ffc107', boxShadow: '2px 2px 4px 0px rgb(0, 0, 0, 0.5)',
        whiteSpace: 'nowrap', display: 'none', transition: 'opacity 0.2s ease-out'
    });
    overlay.appendChild(sourceNameTip);
    sourceNameTip.appendChild(createElement('img', { verticalAlign: 'middle', width: '16px' }, { src: './_content/FindRazorSourceFile/ASPWebApplication_16x.svg' }));
    const sourceNameTipProjectName = createElement('span', { verticalAlign: 'middle', marginLeft: '4px' });
    sourceNameTip.appendChild(sourceNameTipProjectName);
    sourceNameTip.appendChild(createElement('span', { verticalAlign: 'middle' }, { textContent: ' | ' }));
    sourceNameTip.appendChild(createElement('img', { verticalAlign: 'middle', width: '16px' }, { src: './_content/FindRazorSourceFile/ASPRazorFile_16x.svg' }));
    const sourceNameTipItemName = createElement('span', { verticalAlign: 'middle', marginLeft: '4px' });
    sourceNameTip.appendChild(sourceNameTipItemName);
    const settingsButton = createElement('button', {
        position: 'fixed', bottom: '8px', right: '8px', height: '32px', paddingLeft: '30px',
        fontFamily: 'sans-serif', fontSize: '12px', color: '#111',
        border: 'none', backgroundColor: '#fff', borderRadius: '64px', outline: 'none',
        backgroundImage: 'url(\'./_content/FindRazorSourceFile/settings_black_24dp.svg\')',
        backgroundRepeat: 'no-repeat', backgroundPosition: '5px center'
    }, { title: 'Find Razor Source File - Settings', textContent: 'Find Razor Source File' });
    overlay.appendChild(settingsButton);
    const settingsForm = createElement('div', {
        position: 'fixed', bottom: '0', right: '8px', padding: '8px 12px',
        border: '#ccc', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '2px 2px 4px 0px rgb(0, 0, 0, 0.5)',
        opacity: '0', transition: 'ease-out all 0.2s', pointerEvents: 'none'
    });
    const labelForOpenInVSCode = createElement('label', { margin: '0', padding: '0', fontFamily: 'sans-serif', fontSize: '12px', color: '#111' });
    const settingsOpenInVSCode = createElement('input', { margin: '0 8px 0 0', padding: '0', verticalAlign: 'middle' }, { type: 'checkbox' });
    labelForOpenInVSCode.appendChild(settingsOpenInVSCode);
    labelForOpenInVSCode.appendChild(createElement('span', { verticalAlign: 'middle' }, { textContent: 'Open the .razor file of the clicked component in ' }));
    labelForOpenInVSCode.appendChild(createElement('img', { verticalAlign: 'middle', width: '18px' }, { src: './_content/FindRazorSourceFile/vscode.svg' }));
    labelForOpenInVSCode.appendChild(createElement('span', { verticalAlign: 'middle' }, { textContent: ' VSCode' }));
    settingsForm.appendChild(labelForOpenInVSCode);
    overlay.appendChild(settingsForm);
    return { overlay, sourceNameTip, sourceNameTipProjectName, sourceNameTipItemName, settingsButton, settingsForm, settingsOpenInVSCode };
}
function updateUIeffects(mode) {
    const overlayOpacity = mode === 1 /* Active */ ? 0.3 : 0.5;
    const sourcetipOpacity = mode === 1 /* Active */ ? '0.8' : '1.0';
    elements.overlay.style.borderColor = `rgba(0, 0, 0, ${overlayOpacity})`;
    elements.overlay.style.boxShadow = `inset rgb(0, 0, 0, ${overlayOpacity}) 0px 0px 6px 4px`;
    elements.sourceNameTip.style.opacity = sourcetipOpacity;
}
function onKeyDown(ev) {
    const pressedCtrlShiftF = (ev.code === 'KeyF' && ev.ctrlKey && ev.shiftKey && !ev.metaKey && !ev.altKey);
    const pressedEscape = (ev.code === 'Escape' && !ev.ctrlKey && !ev.shiftKey && !ev.metaKey && !ev.altKey);
    if (currentMode === 0 /* Inactive */ && pressedCtrlShiftF) {
        ev.stopPropagation();
        ev.preventDefault();
        currentMode = 1 /* Active */;
        elements.overlay.style.borderWidth = '50vh 50vw';
        elements.overlay.style.display = 'block';
        hideSettingsForm();
        setTimeout(() => { if (currentMode === 1 /* Active */ || currentMode === 2 /* Locked */)
            elements.overlay.style.opacity = '1'; }, 1);
        elements.sourceNameTipProjectName.textContent = '';
        elements.sourceNameTipItemName.textContent = '';
        currentScope = null;
        currentScopeRect = null;
    }
    else if ((currentMode === 1 /* Active */ || currentMode === 2 /* Locked */) && (pressedEscape || pressedCtrlShiftF)) {
        ev.stopPropagation();
        ev.preventDefault();
        currentMode = pressedCtrlShiftF ? 0 /* Inactive */ : (currentMode === 2 /* Locked */ ? 1 /* Active */ : 0 /* Inactive */);
        updateUIeffects(1 /* Active */);
        elements.sourceNameTip.style.display = 'none';
        elements.overlay.style.borderWidth = '50vh 50vw';
        hideSettingsForm();
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
    hideSettingsForm();
    if (currentMode === 1 /* Active */) {
        if (currentScope !== null && lastDetectedRazorSource !== null && lastDetectedRazorSource !== NotFound) {
            currentMode = 2 /* Locked */;
            updateUIeffects(2 /* Locked */);
            const event = new Event("razorsource:lockin" /* LockIn */, { bubbles: false, cancelable: false });
            event.razorSourceName = lastDetectedRazorSource;
            document.dispatchEvent(event);
            // Open in a VSCode.
            if (options.openInVSCode) {
                window.location.href = `vscode://file/${lastDetectedRazorSource.fullPath}`;
            }
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
function settingsButton_onClick(ev) {
    ev.stopPropagation();
    if (isHiddenSettingsForm())
        showSettingsForm();
    else
        hideSettingsForm();
}
function showSettingsForm() {
    elements.settingsForm.style.opacity = '1';
    elements.settingsForm.style.bottom = '48px';
    elements.settingsForm.style.pointerEvents = 'unset';
}
function hideSettingsForm() {
    elements.settingsForm.style.opacity = '0';
    elements.settingsForm.style.bottom = '0';
    elements.settingsForm.style.pointerEvents = 'none';
}
function isHiddenSettingsForm() {
    return elements.settingsForm.style.opacity === '0';
}
function settingsOpenInVSCode_onClick(ev) {
    ev.stopPropagation();
    options.openInVSCode = elements.settingsOpenInVSCode.checked;
    saveOptionsFromLocalStorage();
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
        const razorSourceName = { projectName: p[0], itemName: p[1], fullPath: p[2] };
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
    elements.sourceNameTipProjectName.textContent = razorSourceName.projectName;
    elements.sourceNameTipItemName.textContent = razorSourceName.itemName;
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
function window_onResize(ev) {
    if (currentMode === 0 /* Inactive */)
        return;
    if (currentScope === null || currentScopeRect === null)
        return;
    if (lastDetectedRazorSource === null || lastDetectedRazorSource === 'NotFound')
        return;
    currentScopeRect = getScopeRect(currentScope);
    displayScopeMask(currentScopeRect, lastDetectedRazorSource);
}
function window_onStorage(ev) {
    loadOptionsFromLocalStorage();
}
function saveOptionsFromLocalStorage() {
    const optionString = JSON.stringify(options);
    localStorage.setItem(FindRazorSourceFileClientOptionsKey, optionString);
}
function loadOptionsFromLocalStorage() {
    const optionString = localStorage.getItem(FindRazorSourceFileClientOptionsKey);
    Object.assign(options, JSON.parse(optionString || '{}'));
    elements.settingsOpenInVSCode.checked = options.openInVSCode;
}
