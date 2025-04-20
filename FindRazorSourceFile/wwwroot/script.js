const options = {
    openInVSCode: false
};
const FindRazorSourceFileClientOptionsKey = 'razorsource:options';
const NotFound = 'NotFound';
const none = 'none';
const NULL = null;
const CONTENT_ROOT = './_content/FindRazorSourceFile/';
const FINDRAZORSOURCEFILE_UI_TAG = "findrazorsourcefile-ui";
const doc = document;
const COMMENT_NODE = Node.COMMENT_NODE;
let _onceInit = false;
let logicalNodeParentKey = NULL;
let logicalNodeChildrenKey = NULL;
let uiElements;
let lastDetectedRazorSource = NULL;
let currentScope = NULL;
let currentScopeTopElement = NULL;
let currentScopeRect = NULL;
const razorSourceMap = {};
let currentMode = 0;
const isArray = (obj) => Array.isArray(obj);
const addEventListener = (target, handlers) => {
    for (let key in handlers) {
        target.addEventListener(key, handlers[key]);
    }
};
const removeEventListener = (target, handlers) => {
    for (let key in handlers) {
        target.removeEventListener(key, handlers[key]);
    }
};
const stopPropagation = (ev) => ev.stopPropagation();
const applyStyle = (element, style) => Object.assign(element.style, style);
const createElement = (tagName, style, attrib, children) => {
    let exposes = {};
    const element = doc.createElement(tagName);
    if (style)
        applyStyle(element, style);
    if (attrib)
        Object.assign(element, attrib);
    const appendChild = ([childElement, childExposes]) => {
        element.appendChild(childElement);
        exposes = { ...exposes, ...childExposes };
        return childElement;
    };
    children?.forEach(child => {
        if (isArray(child)) {
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
export const init = () => {
    if (_onceInit)
        return;
    _onceInit = true;
    getLogicalNodePropKeys();
    customElements.define(FINDRAZORSOURCEFILE_UI_TAG, UIRoot);
    const ensureFindRazorSourceFileUI = () => {
        if (document.body.querySelector(FINDRAZORSOURCEFILE_UI_TAG))
            return;
        const [uiRoot] = createElement(FINDRAZORSOURCEFILE_UI_TAG);
        doc.body.appendChild(uiRoot);
    };
    Blazor.addEventListener("enhancedload", ensureFindRazorSourceFileUI);
    ensureFindRazorSourceFileUI();
    addEventListener(doc, { keydown: onKeyDown });
    addEventListener(window, {
        resize: window_onResize,
        storage: window_onStorage
    });
};
const getLogicalNodePropKeys = () => {
    const commentWalker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT, NULL);
    while (commentWalker.nextNode()) {
        const commentNode = commentWalker.currentNode;
        if (commentNode.textContent !== "!")
            continue;
        const symbolProps = Object.getOwnPropertySymbols(commentNode);
        symbolProps.forEach(prop => {
            const propValue = commentNode[prop];
            if (!logicalNodeParentKey && typeof (propValue.nodeType) !== undefined)
                logicalNodeParentKey = prop;
            if (!logicalNodeChildrenKey && isArray(propValue))
                logicalNodeChildrenKey = prop;
        });
        if (logicalNodeParentKey && logicalNodeChildrenKey)
            break;
    }
};
class UIRoot extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const shadow = this.attachShadow({ mode: "open" });
        const ui = createUIElements(shadow);
        uiElements = ui;
        updateUIeffects(1);
        addEventListener(ui.overlay, {
            mousemove: overlay_onMouseMove,
            click: overlay_onClick
        });
        addEventListener(ui.sourceNameTip, {
            mousemove: stopPropagation,
            click: sourceNameTip_onClick
        });
        addEventListener(ui.settingsButton, { click: settingsButton_onClick });
        addEventListener(ui.settingsForm, { click: stopPropagation });
        addEventListener(ui.settingsOpenInVSCode, { click: settingsOpenInVSCode_onClick });
        loadOptionsFromLocalStorage();
        this.dispose = () => {
            removeEventListener(ui.overlay, {
                mousemove: overlay_onMouseMove,
                click: overlay_onClick
            });
            removeEventListener(ui.sourceNameTip, {
                mousemove: stopPropagation,
                click: sourceNameTip_onClick
            });
            removeEventListener(ui.settingsButton, { click: settingsButton_onClick });
            removeEventListener(ui.settingsForm, { click: stopPropagation });
            removeEventListener(ui.settingsOpenInVSCode, { click: settingsOpenInVSCode_onClick });
        };
    }
    disconnectedCallback() {
        this.dispose?.();
    }
}
const createUIElements = (parent) => {
    const [overlay, exposes] = createElement('div', {
        position: 'fixed', top: '0', left: '0', bottom: '0', right: '0', zIndex: '9999',
        backgroundColor: 'transparent', borderStyle: 'solid', display: none, opacity: '0',
        transition: 'border 0.2s ease-out, box-shadow 0.2s ease-out, opacity 0.2s linear'
    }, NULL, [
        {
            sourceNameTip: createElement('div', {
                position: 'absolute', top: '4px', left: '4px', padding: '2px 6px',
                fontFamily: 'sans-serif', fontSize: '12px', color: '#111',
                backgroundColor: '#ffc107', boxShadow: '2px 2px 4px 0px rgb(0, 0, 0, 0.5)',
                whiteSpace: 'nowrap', display: none, transition: 'opacity 0.2s ease-out'
            }, NULL, [
                createElement('img', { verticalAlign: 'middle', width: '16px' }, { src: CONTENT_ROOT + 'ASPWebApplication_16x.svg' }),
                { sourceNameTipProjectName: createElement('span', { verticalAlign: 'middle', marginLeft: '4px' }) },
                createElement('span', { verticalAlign: 'middle' }, { textContent: ' | ' }),
                createElement('img', { verticalAlign: 'middle', width: '16px' }, { src: CONTENT_ROOT + 'ASPRazorFile_16x.svg' }),
                { sourceNameTipItemName: createElement('span', { verticalAlign: 'middle', marginLeft: '4px' }) }
            ]),
        },
        {
            settingsButton: createElement('button', {
                position: 'fixed', bottom: '8px', right: '8px', height: '32px', paddingLeft: '30px',
                fontFamily: 'sans-serif', fontSize: '12px', color: '#111',
                border: none, backgroundColor: '#fff', borderRadius: '64px', outline: none,
                backgroundImage: `url('${CONTENT_ROOT}settings_black_24dp.svg')`,
                backgroundRepeat: 'no-repeat', backgroundPosition: '5px center'
            }, { title: 'Find Razor Source File - Settings', textContent: 'Find Razor Source File' })
        },
        {
            settingsForm: createElement('div', {
                position: 'fixed', bottom: '0', right: '8px', padding: '8px 12px',
                border: '#ccc', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '2px 2px 4px 0px rgb(0, 0, 0, 0.5)',
                opacity: '0', transition: 'ease-out all 0.2s', pointerEvents: none
            }, NULL, [
                createElement('label', { margin: '0', padding: '0', fontFamily: 'sans-serif', fontSize: '12px', color: '#111' }, NULL, [
                    { settingsOpenInVSCode: createElement('input', { margin: '0 8px 0 0', padding: '0', verticalAlign: 'middle' }, { type: 'checkbox' }) },
                    createElement('span', { verticalAlign: 'middle' }, { textContent: 'Open the .razor file of the clicked component in ' }),
                    createElement('img', { verticalAlign: 'middle', width: '18px' }, { src: CONTENT_ROOT + 'vscode.svg' }),
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
    applyStyle(uiElements.overlay, {
        borderColor: `rgba(0, 0, 0, ${overlayOpacity})`,
        boxShadow: `inset rgb(0, 0, 0, ${overlayOpacity}) 0px 0px 6px 4px`
    });
    uiElements.sourceNameTip.style.opacity = sourcetipOpacity;
};
const setSourceNameTip = (projectName, itemName) => {
    uiElements.sourceNameTipProjectName.textContent = projectName;
    uiElements.sourceNameTipItemName.textContent = itemName;
};
const onKeyDown = (ev) => {
    const pressedCtrlShiftF = (ev.code === 'KeyF' && ev.ctrlKey && ev.shiftKey && !ev.metaKey && !ev.altKey);
    const pressedEscape = (ev.code === 'Escape' && !ev.ctrlKey && !ev.shiftKey && !ev.metaKey && !ev.altKey);
    if (currentMode === 0 && pressedCtrlShiftF) {
        stopPropagation(ev);
        ev.preventDefault();
        currentMode = 1;
        applyStyle(uiElements.overlay, {
            borderWidth: '50vh 50vw',
            display: 'block'
        });
        hideSettingsForm();
        setTimeout(() => { if (currentMode === 1 || currentMode === 2)
            uiElements.overlay.style.opacity = '1'; }, 1);
        setSourceNameTip("", "");
        currentScope = NULL;
        currentScopeTopElement = NULL;
        currentScopeRect = NULL;
    }
    else if ((currentMode === 1 || currentMode === 2) && (pressedEscape || pressedCtrlShiftF)) {
        stopPropagation(ev);
        ev.preventDefault();
        currentMode = pressedCtrlShiftF ? 0 : (currentMode === 2 ? 1 : 0);
        updateUIeffects(1);
        uiElements.sourceNameTip.style.display = none;
        uiElements.overlay.style.borderWidth = '50vh 50vw';
        hideSettingsForm();
        if (currentMode === 0) {
            uiElements.overlay.style.opacity = '0';
            setTimeout(() => { if (currentMode === 0)
                uiElements.overlay.style.display = none; }, 200);
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
        if (currentScope && lastDetectedRazorSource && lastDetectedRazorSource !== NotFound) {
            currentMode = 2;
            updateUIeffects(2);
            const event = new Event("razorsource:lockin", { bubbles: false, cancelable: false });
            event.razorSourceName = lastDetectedRazorSource;
            doc.dispatchEvent(event);
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
    stopPropagation(ev);
    if (currentMode === 1) {
        overlay_onClick(ev);
    }
};
const settingsButton_onClick = (ev) => {
    stopPropagation(ev);
    if (isHiddenSettingsForm())
        showSettingsForm();
    else
        hideSettingsForm();
};
const showSettingsForm = () => Object.assign(uiElements.settingsForm.style, { opacity: '1', bottom: '48px', pointerEvents: 'unset' });
const hideSettingsForm = () => Object.assign(uiElements.settingsForm.style, { opacity: '0', bottom: '0', pointerEvents: none });
const isHiddenSettingsForm = () => uiElements.settingsForm.style.opacity === '0';
const settingsOpenInVSCode_onClick = (ev) => {
    stopPropagation(ev);
    options.openInVSCode = uiElements.settingsOpenInVSCode.checked;
    saveOptionsFromLocalStorage();
};
const detectTargetAndDisplayIt = async (ev) => {
    const result = await detectScope(ev);
    if (result.scopeHasChanged === false)
        return;
    lastDetectedRazorSource = await getRazorSourceName(result.scope);
    displayScopeMask(result.scopeRect, lastDetectedRazorSource);
};
const detectScope = async (ev) => {
    uiElements.overlay.style.visibility = 'hidden';
    const hovered = doc.elementFromPoint(ev.clientX, ev.clientY);
    uiElements.overlay.style.visibility = 'visible';
    let scope = NULL;
    let topElement = NULL;
    for (let element = hovered; element; element = element.parentElement) {
        if (!scope) {
            scope = await getScope(element);
            if (scope)
                topElement = element;
        }
        else {
            if (scope === await getScope(element))
                topElement = element;
        }
    }
    let nextScopeRect = NULL;
    if (!scope || !topElement) {
        if (currentScopeRect &&
            currentScopeRect.left < ev.clientX && ev.clientX < currentScopeRect.right &&
            currentScopeRect.top < ev.clientY && ev.clientY < currentScopeRect.bottom) {
            return { scope: currentScope, scopeRect: currentScopeRect, scopeHasChanged: false };
        }
    }
    else if (currentScope && currentScope !== scope && currentScopeRect) {
        if (currentScopeRect.left < ev.clientX && ev.clientX < currentScopeRect.right &&
            currentScopeRect.top < ev.clientY && ev.clientY < currentScopeRect.bottom) {
            nextScopeRect = getScopeRect(topElement);
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
        currentScopeTopElement = topElement;
        currentScopeRect = nextScopeRect || (topElement ? getScopeRect(topElement) : NULL);
    }
    return { scope: currentScope, scopeRect: currentScopeRect, scopeHasChanged };
};
const getScope = async (element) => {
    const scope = element.getAttributeNames().filter(name => name.startsWith('b-'))[0] || NULL;
    const reazorSourceName = await getRazorSourceName(scope);
    if (!reazorSourceName || reazorSourceName === NotFound)
        return NULL;
    return scope;
};
const getRazorSourceName = async (scope) => {
    if (!scope)
        return NULL;
    let razorSourceName = razorSourceMap[scope] || NULL;
    if (razorSourceName)
        return razorSourceName;
    const res = await fetch(`${CONTENT_ROOT}RazorSourceMapFiles/${scope}.txt`);
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
    if (!scopeRect || !razorSourceName || razorSourceName === NotFound) {
        uiElements.sourceNameTip.style.display = none;
        uiElements.overlay.style.borderWidth = '50vh 50vw';
        return;
    }
    const overlayRect = uiElements.overlay.getBoundingClientRect();
    applyStyle(uiElements.overlay, {
        borderStyle: 'solid',
        borderTopWidth: scopeRect.top + 'px',
        borderLeftWidth: scopeRect.left + 'px',
        borderBottomWidth: (overlayRect.height - scopeRect.bottom) + 'px',
        borderRightWidth: (overlayRect.width - scopeRect.right) + 'px'
    });
    setSourceNameTip(razorSourceName.projectName, razorSourceName.itemName);
    uiElements.sourceNameTip.style.display = 'block';
};
const getScopeRect = (element) => {
    const getLogicalNodes = (element) => {
        const empty = [NULL, []];
        if (!logicalNodeParentKey || !logicalNodeChildrenKey)
            return empty;
        const logicalNodeParent = element[logicalNodeParentKey];
        const logicalNodeChildren = element[logicalNodeChildrenKey];
        if (isArray(logicalNodeParent) || !logicalNodeParent)
            return empty;
        if (!isArray(logicalNodeChildren) || !logicalNodeChildren)
            return empty;
        return [logicalNodeParent, logicalNodeChildren];
    };
    const getChildren = (element) => {
        const [logicalNodeParent, logicalNodeChildren] = getLogicalNodes(element);
        if (logicalNodeParent?.nodeType === COMMENT_NODE) {
            const [_, children] = getLogicalNodes(logicalNodeParent);
            return [...children, element];
        }
        else if (element.nodeType === COMMENT_NODE) {
            return [...logicalNodeChildren, element];
        }
        return [element];
    };
    const getRect = (children) => {
        const RectNA = { top: 9999999, left: 9999999, bottom: 0, right: 0 };
        const scopeRect = { ...RectNA };
        children.forEach(e => {
            const rect = (e.nodeType === Node.ELEMENT_NODE) ? e.getBoundingClientRect() :
                (e.nodeType === COMMENT_NODE) ? getRect(getLogicalNodes(e)[1]) :
                    RectNA;
            scopeRect.top = Math.min(scopeRect.top, rect.top);
            scopeRect.left = Math.min(scopeRect.left, rect.left);
            scopeRect.bottom = Math.max(scopeRect.bottom, rect.bottom);
            scopeRect.right = Math.max(scopeRect.right, rect.right);
        });
        return scopeRect;
    };
    const children = getChildren(element);
    return getRect(children);
};
const window_onResize = (ev) => {
    if (currentMode === 0)
        return;
    if (!currentScope || !currentScopeTopElement || !currentScopeRect)
        return;
    if (!lastDetectedRazorSource || lastDetectedRazorSource === NotFound)
        return;
    currentScopeRect = getScopeRect(currentScopeTopElement);
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
