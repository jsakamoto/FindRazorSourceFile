const NotFound = 'NotFound';
let uiElements;
let lastDetectedRazorSource = null;
let currentScope = null;
let currentScopeRect = null;
const razorSourceMap = {};
let currentMode = 0;
const options = {
    openInVSCode: false
};
const FindRazorSourceFileClientOptionsKey = 'razorsource:options';
export const init = () => {
    customElements.define("findrazorsourcefile-ui", UIRoot);
    const uiRoot = document.createElement("findrazorsourcefile-ui");
    document.body.appendChild(uiRoot);
};
class UIRoot extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const shadow = this.attachShadow({ mode: "open" });
        uiElements = createUIElements(shadow);
        updateUIeffects(1);
        uiElements.overlay.addEventListener('mousemove', ev => overlay_onMouseMove(ev));
        uiElements.overlay.addEventListener('click', ev => overlay_onClick(ev));
        uiElements.sourceNameTip.addEventListener('mousemove', ev => ev.stopPropagation());
        uiElements.sourceNameTip.addEventListener('click', ev => sourceNameTip_onClick(ev));
        uiElements.settingsButton.addEventListener('click', ev => settingsButton_onClick(ev));
        uiElements.settingsForm.addEventListener('click', ev => ev.stopPropagation());
        uiElements.settingsOpenInVSCode.addEventListener('click', ev => settingsOpenInVSCode_onClick(ev));
        document.addEventListener('keydown', ev => onKeyDown(ev));
        window.addEventListener('resize', ev => window_onResize(ev));
        window.addEventListener('storage', ev => window_onStorage(ev));
        loadOptionsFromLocalStorage();
    }
}
const createElement = (tagName, style, attrib, children) => {
    let exposes = {};
    const element = document.createElement(tagName);
    if (style !== null) {
        Object.assign(element.style, style);
    }
    if (typeof (attrib) !== 'undefined' && attrib !== null) {
        Object.assign(element, attrib);
    }
    const appendChild = ([childElement, childExposes]) => {
        element.appendChild(childElement);
        exposes = { ...exposes, ...childExposes };
        return childElement;
    };
    children?.forEach(child => {
        if (Array.isArray(child)) {
            appendChild(child);
        }
        else {
            for (let childKey in child) {
                const childElement = appendChild(child[childKey]);
                exposes[childKey] = childElement;
            }
        }
    });
    return [element, exposes];
};
const createUIElements = (parent) => {
    const [overlay, exposes] = createElement('div', {
        position: 'fixed', top: '0', left: '0', bottom: '0', right: '0', zIndex: '9999',
        backgroundColor: 'transparent', borderStyle: 'solid', display: 'none', opacity: '0',
        transition: 'border 0.2s ease-out, box-shadow 0.2s ease-out, opacity 0.2s linear'
    }, null, [
        {
            sourceNameTip: createElement('div', {
                position: 'absolute', top: '4px', left: '4px', padding: '2px 6px',
                fontFamily: 'sans-serif', fontSize: '12px', color: '#111',
                backgroundColor: '#ffc107', boxShadow: '2px 2px 4px 0px rgb(0, 0, 0, 0.5)',
                whiteSpace: 'nowrap', display: 'none', transition: 'opacity 0.2s ease-out'
            }, null, [
                createElement('img', { verticalAlign: 'middle', width: '16px' }, { src: './_content/FindRazorSourceFile/ASPWebApplication_16x.svg' }),
                { sourceNameTipProjectName: createElement('span', { verticalAlign: 'middle', marginLeft: '4px' }) },
                createElement('span', { verticalAlign: 'middle' }, { textContent: ' | ' }),
                createElement('img', { verticalAlign: 'middle', width: '16px' }, { src: './_content/FindRazorSourceFile/ASPRazorFile_16x.svg' }),
                { sourceNameTipItemName: createElement('span', { verticalAlign: 'middle', marginLeft: '4px' }) }
            ]),
        },
        {
            settingsButton: createElement('button', {
                position: 'fixed', bottom: '8px', right: '8px', height: '32px', paddingLeft: '30px',
                fontFamily: 'sans-serif', fontSize: '12px', color: '#111',
                border: 'none', backgroundColor: '#fff', borderRadius: '64px', outline: 'none',
                backgroundImage: 'url(\'./_content/FindRazorSourceFile/settings_black_24dp.svg\')',
                backgroundRepeat: 'no-repeat', backgroundPosition: '5px center'
            }, { title: 'Find Razor Source File - Settings', textContent: 'Find Razor Source File' })
        },
        {
            settingsForm: createElement('div', {
                position: 'fixed', bottom: '0', right: '8px', padding: '8px 12px',
                border: '#ccc', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '2px 2px 4px 0px rgb(0, 0, 0, 0.5)',
                opacity: '0', transition: 'ease-out all 0.2s', pointerEvents: 'none'
            }, null, [
                createElement('label', { margin: '0', padding: '0', fontFamily: 'sans-serif', fontSize: '12px', color: '#111' }, null, [
                    { settingsOpenInVSCode: createElement('input', { margin: '0 8px 0 0', padding: '0', verticalAlign: 'middle' }, { type: 'checkbox' }) },
                    createElement('span', { verticalAlign: 'middle' }, { textContent: 'Open the .razor file of the clicked component in ' }),
                    createElement('img', { verticalAlign: 'middle', width: '18px' }, { src: './_content/FindRazorSourceFile/vscode.svg' }),
                    createElement('span', { verticalAlign: 'middle' }, { textContent: ' VSCode' }),
                ])
            ])
        }
    ]);
    parent.appendChild(overlay);
    return { ...{ overlay }, ...exposes };
};
const updateUIeffects = (mode) => {
    const overlayOpacity = mode === 1 ? 0.3 : 0.5;
    const sourcetipOpacity = mode === 1 ? '0.8' : '1.0';
    uiElements.overlay.style.borderColor = `rgba(0, 0, 0, ${overlayOpacity})`;
    uiElements.overlay.style.boxShadow = `inset rgb(0, 0, 0, ${overlayOpacity}) 0px 0px 6px 4px`;
    uiElements.sourceNameTip.style.opacity = sourcetipOpacity;
};
const onKeyDown = (ev) => {
    const pressedCtrlShiftF = (ev.code === 'KeyF' && ev.ctrlKey && ev.shiftKey && !ev.metaKey && !ev.altKey);
    const pressedEscape = (ev.code === 'Escape' && !ev.ctrlKey && !ev.shiftKey && !ev.metaKey && !ev.altKey);
    if (currentMode === 0 && pressedCtrlShiftF) {
        ev.stopPropagation();
        ev.preventDefault();
        currentMode = 1;
        uiElements.overlay.style.borderWidth = '50vh 50vw';
        uiElements.overlay.style.display = 'block';
        hideSettingsForm();
        setTimeout(() => { if (currentMode === 1 || currentMode === 2)
            uiElements.overlay.style.opacity = '1'; }, 1);
        uiElements.sourceNameTipProjectName.textContent = '';
        uiElements.sourceNameTipItemName.textContent = '';
        currentScope = null;
        currentScopeRect = null;
    }
    else if ((currentMode === 1 || currentMode === 2) && (pressedEscape || pressedCtrlShiftF)) {
        ev.stopPropagation();
        ev.preventDefault();
        currentMode = pressedCtrlShiftF ? 0 : (currentMode === 2 ? 1 : 0);
        updateUIeffects(1);
        uiElements.sourceNameTip.style.display = 'none';
        uiElements.overlay.style.borderWidth = '50vh 50vw';
        hideSettingsForm();
        if (currentMode === 0) {
            uiElements.overlay.style.opacity = '0';
            setTimeout(() => { if (currentMode === 0)
                uiElements.overlay.style.display = 'none'; }, 200);
        }
    }
};
const overlay_onMouseMove = async (ev) => {
    if (currentMode !== 1)
        return;
    detectTargetAndDisplayIt(ev);
};
const overlay_onClick = (ev) => {
    hideSettingsForm();
    if (currentMode === 1) {
        if (currentScope !== null && lastDetectedRazorSource !== null && lastDetectedRazorSource !== NotFound) {
            currentMode = 2;
            updateUIeffects(2);
            const event = new Event("razorsource:lockin", { bubbles: false, cancelable: false });
            event.razorSourceName = lastDetectedRazorSource;
            document.dispatchEvent(event);
            if (options.openInVSCode) {
                window.location.href = `vscode://file/${lastDetectedRazorSource.fullPath}`;
            }
        }
    }
    else if (currentMode === 2) {
        currentMode = 1;
        updateUIeffects(1);
        detectTargetAndDisplayIt(ev);
    }
};
const sourceNameTip_onClick = (ev) => {
    ev.stopPropagation();
    if (currentMode === 1) {
        overlay_onClick(ev);
    }
};
const settingsButton_onClick = (ev) => {
    ev.stopPropagation();
    if (isHiddenSettingsForm())
        showSettingsForm();
    else
        hideSettingsForm();
};
const showSettingsForm = () => Object.assign(uiElements.settingsForm.style, { opacity: '1', bottom: '48px', pointerEvents: 'unset' });
const hideSettingsForm = () => Object.assign(uiElements.settingsForm.style, { opacity: '0', bottom: '0', pointerEvents: 'none' });
const isHiddenSettingsForm = () => uiElements.settingsForm.style.opacity === '0';
const settingsOpenInVSCode_onClick = (ev) => {
    ev.stopPropagation();
    options.openInVSCode = uiElements.settingsOpenInVSCode.checked;
    saveOptionsFromLocalStorage();
};
const detectTargetAndDisplayIt = async (ev) => {
    const result = detectScope(ev);
    if (result.scopeHasChanged === false)
        return;
    lastDetectedRazorSource = await getRazorSourceName(result.scope);
    displayScopeMask(result.scopeRect, lastDetectedRazorSource);
};
const detectScope = (ev) => {
    uiElements.overlay.style.visibility = 'hidden';
    const hovered = document.elementFromPoint(ev.clientX, ev.clientY);
    uiElements.overlay.style.visibility = 'visible';
    let scope = null;
    for (var nearestTarget = hovered; nearestTarget !== null; nearestTarget = nearestTarget.parentElement) {
        scope = getScope(nearestTarget);
        if (scope !== null)
            break;
    }
    let nextScopeRect = null;
    if (scope === null) {
        if (currentScopeRect !== null) {
            if (currentScopeRect.left < ev.clientX && ev.clientX < currentScopeRect.right &&
                currentScopeRect.top < ev.clientY && ev.clientY < currentScopeRect.bottom) {
                return { scope: currentScope, scopeRect: currentScopeRect, scopeHasChanged: false };
            }
        }
    }
    else if (currentScope !== null && currentScope !== scope && currentScopeRect !== null) {
        if (currentScopeRect.left < ev.clientX && ev.clientX < currentScopeRect.right &&
            currentScopeRect.top < ev.clientY && ev.clientY < currentScopeRect.bottom) {
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
};
const getScope = (element) => element.getAttributeNames().filter(name => name.startsWith('b-'))[0] || null;
const getRazorSourceName = async (scope) => {
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
};
const displayScopeMask = (scopeRect, razorSourceName) => {
    if (scopeRect === null || razorSourceName === null || razorSourceName === NotFound) {
        uiElements.sourceNameTip.style.display = 'none';
        uiElements.overlay.style.borderWidth = '50vh 50vw';
        return;
    }
    const overlayRect = uiElements.overlay.getBoundingClientRect();
    uiElements.overlay.style.borderStyle = 'solid';
    uiElements.overlay.style.borderTopWidth = scopeRect.top + 'px';
    uiElements.overlay.style.borderLeftWidth = scopeRect.left + 'px';
    uiElements.overlay.style.borderBottomWidth = (overlayRect.height - scopeRect.bottom) + 'px';
    uiElements.overlay.style.borderRightWidth = (overlayRect.width - scopeRect.right) + 'px';
    uiElements.sourceNameTipProjectName.textContent = razorSourceName.projectName;
    uiElements.sourceNameTipItemName.textContent = razorSourceName.itemName;
    uiElements.sourceNameTip.style.display = 'block';
};
const getScopeRect = (scope) => {
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
};
const window_onResize = (ev) => {
    if (currentMode === 0)
        return;
    if (currentScope === null || currentScopeRect === null)
        return;
    if (lastDetectedRazorSource === null || lastDetectedRazorSource === 'NotFound')
        return;
    currentScopeRect = getScopeRect(currentScope);
    displayScopeMask(currentScopeRect, lastDetectedRazorSource);
};
const window_onStorage = (ev) => loadOptionsFromLocalStorage();
const saveOptionsFromLocalStorage = () => {
    const optionString = JSON.stringify(options);
    localStorage.setItem(FindRazorSourceFileClientOptionsKey, optionString);
};
const loadOptionsFromLocalStorage = () => {
    const optionString = localStorage.getItem(FindRazorSourceFileClientOptionsKey);
    Object.assign(options, JSON.parse(optionString || '{}'));
    uiElements.settingsOpenInVSCode.checked = options.openInVSCode;
};
