interface UIElements {
    overlay: HTMLElement;
    sourceNameTip: HTMLElement;
    sourceNameTipProjectName: HTMLElement;
    sourceNameTipItemName: HTMLElement;
    settingsButton: HTMLElement;
    settingsForm: HTMLElement;
    settingsOpenInVSCode: HTMLInputElement;
}

interface RazorSourceNameType {
    projectName: string;
    itemName: string;
    fullPath: string;
}
type RazorSourceName = RazorSourceNameType | 'NotFound';

const enum Mode {
    Inactive,
    Active,
    Locked
}

const enum RazorSourceEventNames {
    LockIn = 'razorsource:lockin'
}

interface RazorSourceEvent extends Event {
    razorSourceName: RazorSourceNameType;
}

interface Rect {
    top: number;
    left: number;
    bottom: number;
    right: number;
}

interface FindRazorSourceFileClientOptions {
    openInVSCode: boolean;
}
const options: FindRazorSourceFileClientOptions = {
    openInVSCode: false
};
const FindRazorSourceFileClientOptionsKey = 'razorsource:options';

type HTMLElementMap = { [key: string]: HTMLElement };

type CreateElementResult = [HTMLElement, HTMLElementMap];

declare global {
    interface Node {
        [key: symbol]: Node | Node[] | undefined;
    }
}

type ComponentMap = {
    hash: string,
    rect: () => Rect;
    depth: number;
    source: RazorSourceNameType;
    elements: HTMLElement[];
}

type DetectedScopeResult = {
    scope: string | null,
    scopeRect: Rect | null,
    scopeHasChanged: boolean,
    source?: RazorSourceName | null
};

// Constants

const NotFound = 'NotFound';

const none = 'none';

const NULL = null;

const CONTENT_ROOT = './_content/FindRazorSourceFile/';

const FINDRAZORSOURCEFILE_UI_TAG = "findrazorsourcefile-ui";

const doc = document;

const COMMENT_NODE = Node.COMMENT_NODE;

const ELEMENT_NODE = Node.ELEMENT_NODE;

const MaxRect: Rect = { top: Number.MAX_SAFE_INTEGER, left: Number.MAX_SAFE_INTEGER, bottom: Number.MIN_SAFE_INTEGER, right: Number.MIN_SAFE_INTEGER } as const;

declare const Blazor: any; // Blazor is defined in the parent page

// Global State

let _onceInit = false;

let logicalNodeParentKey = NULL as null | symbol;

let logicalNodeChildrenKey = NULL as null | symbol;

let uiElements: UIElements;

let lastDetectedRazorSource: RazorSourceName | null = NULL;

let currentComponentsMap: ComponentMap[] = [];

let currentScope: string | null = NULL;

let currentScopeElements: Node[] = [];

let currentScopeRect: Rect | null = NULL;

const razorSourceMap: { [key: string]: RazorSourceName | undefined } = {};

let currentMode: Mode = Mode.Inactive;

// Utility functions

const isArray = (obj: unknown): obj is any[] => Array.isArray(obj);

/** Combine multiple rectangles into one. */
const combineRects = (rects: Rect[]): Rect => rects.reduce((pre, cur) => ({
    top: Math.min(pre.top, cur.top),
    left: Math.min(pre.left, cur.left),
    bottom: Math.max(pre.bottom, cur.bottom),
    right: Math.max(pre.right, cur.right)
}), MaxRect);

/** Check if the pointer is in the rectangle. */
const isPointerInRect = (pointer: { clientX: number, clientY: number }, rect: Rect | null): boolean => {
    return rect !== null &&
        rect.left < pointer.clientX && pointer.clientX < rect.right &&
        rect.top < pointer.clientY && pointer.clientY < rect.bottom;
}

/** Get the depth of an element in the DOM tree. */
const getDepth = (e: Node | null): number => {
    let depth = 0;
    while (e) { depth++; e = e.parentElement; }
    return depth;
}

/** Add event listeners to a target element */
const addEventListener = (target: HTMLElement | Document | Window, handlers: { [key: string]: any }) => {
    for (let key in handlers) {
        target.addEventListener(key, handlers[key]);
    }
}

/** Remove event listeners from a target element */
const removeEventListener = (target: HTMLElement | Document | Window, handlers: { [key: string]: any }) => {
    for (let key in handlers) {
        target.removeEventListener(key, handlers[key]);
    }
}

/** Stop the event propagation. */
const stopPropagation = (ev: Event) => ev.stopPropagation();

/** Apply a style to an element. */
const applyStyle = (element: HTMLElement, style: object) => Object.assign(element.style, style);

/** Create a new element with optional attributes, styles and children. */
const createElement = (tagName: string, style?: object | null, attrib?: object | null, children?: (CreateElementResult | { [key: string]: CreateElementResult })[]): CreateElementResult => {
    let exposes: HTMLElementMap = {};
    const element = doc.createElement(tagName);
    if (style) applyStyle(element, style);
    if (attrib) Object.assign(element, attrib);

    const appendChild = ([childElement, childExposes]: [HTMLElement, HTMLElementMap]) => {
        element.appendChild(childElement);
        exposes = { ...exposes, ...childExposes };
        return childElement;
    }

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
}

/** 
 * Enable the Razor Source File UI.
 */
export const init = () => {

    if (_onceInit) return;
    _onceInit = true;

    getLogicalNodePropKeys();

    customElements.define(FINDRAZORSOURCEFILE_UI_TAG, UIRoot);

    const ensureFindRazorSourceFileUI = () => {
        if (document.body.querySelector(FINDRAZORSOURCEFILE_UI_TAG)) return;
        const [uiRoot] = createElement(FINDRAZORSOURCEFILE_UI_TAG);
        doc.body.appendChild(uiRoot);
    }

    Blazor.addEventListener("enhancedload", ensureFindRazorSourceFileUI);
    ensureFindRazorSourceFileUI();

    addEventListener(doc, { keydown: onKeyDown });

    addEventListener(window, {
        resize: window_onResize,
        scroll: window_onResize,
        storage: window_onStorage
    });
}

/**
 * Create components map from the explicit markers of "FindRazorSourceFile" in the DOM tree.
 * @returns {Promise<ComponentMap[]>} The components map.
 */
const createComponentsMap = async (): Promise<ComponentMap[]> => {

    const detectMarker = (node: Node) => node.textContent?.trim().match(/^(begin|end):(frsf-[a-z0-9]{10})$/) || [];

    const componentsMap = [] as ComponentMap[];

    // Find all the explicit markers of "FindRazorSourceFile" in the DOM tree.
    // The markers are in the form of HTML comments: <!-- begin:frsf-xxxxxxxxxx --> and <!-- end:frsf-xxxxxxxxxx -->
    // so we can use a TreeWalker to traverse the DOM tree and find all the comments.

    const commentWalker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT, NULL);
    while (commentWalker.nextNode()) {

        // Filter if the current comment node is a begin marker.
        const commentNode = commentWalker.currentNode;
        const [, beginTag, beginHash] = detectMarker(commentNode);
        if (beginTag !== "begin") continue;

        // Get the Razor source name from the hash.
        const razorSourceName = await getRazorSourceName(beginHash);
        if (!razorSourceName || razorSourceName === NotFound) continue;

        // Traverse the DOM tree for sibling nodes until we find the end marker, 
        // and gather all the elements in between.
        let sibling = commentNode.nextSibling;
        const elements = [] as HTMLElement[];
        while (sibling) {
            if (sibling.nodeType === ELEMENT_NODE) {
                elements.push(sibling as HTMLElement);
            }
            if (sibling.nodeType === COMMENT_NODE) {

                // If we find an end marker, we can stop traversing to find the end marker, 
                // and stock the new component map.
                const [, endTag, endHash] = detectMarker(sibling);
                if (endTag === "end" && endHash === beginHash && elements.length > 0) {
                    componentsMap.push({
                        hash: beginHash,
                        rect: () => combineRects(elements.map(e => e.getBoundingClientRect())),
                        depth: Math.min(...elements.map(getDepth)),
                        source: razorSourceName,
                        elements
                    });
                    break;
                }
            }
            sibling = sibling.nextSibling;
        }
    }

    return componentsMap;
}

const getLogicalNodePropKeys = () => {
    const commentWalker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT, NULL);
    while (commentWalker.nextNode()) {
        const commentNode = commentWalker.currentNode;
        if (commentNode.textContent !== "!") continue;

        const symbolProps = Object.getOwnPropertySymbols(commentNode);
        symbolProps.forEach(prop => {
            const propValue = commentNode[prop];
            if (!propValue) return;
            if (isArray(propValue)) logicalNodeChildrenKey = logicalNodeChildrenKey || prop;
            else if (typeof (propValue.nodeType) !== undefined) logicalNodeParentKey = logicalNodeParentKey || prop;
        });
        if (logicalNodeParentKey && logicalNodeChildrenKey) break;
    }
}

class UIRoot extends HTMLElement {

    private dispose: (() => void) | undefined;

    constructor() {
        super();
    }

    connectedCallback() {
        const shadow = this.attachShadow({ mode: "open" });
        const ui = createUIElements(shadow);
        uiElements = ui;

        updateUIeffects(Mode.Active);

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


const createUIElements = (parent: ShadowRoot): UIElements => {

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
                whiteSpace: 'nowrap', display: none, transition: 'opacity 0.2s ease-out', pointerEvents: none
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

    return { ...{ overlay }, ...exposes } as UIElements;
}

const updateUIeffects = (mode: Mode.Active | Mode.Locked): void => {
    const overlayOpacity = mode === Mode.Active ? 0.3 : 0.5;
    const sourcetipOpacity = mode === Mode.Active ? '0.8' : '1.0';
    applyStyle(uiElements.overlay, {
        borderColor: `rgba(0, 0, 0, ${overlayOpacity})`,
        boxShadow: `inset rgb(0, 0, 0, ${overlayOpacity}) 0px 0px 6px 4px`
    });
    applyStyle(uiElements.sourceNameTip, {
        opacity: sourcetipOpacity,
        pointerEvents: mode === Mode.Locked ? 'auto' : 'none'
    });
}

const setSourceNameTip = (projectName: string, itemName: string): void => {
    uiElements.sourceNameTipProjectName.textContent = projectName;
    uiElements.sourceNameTipItemName.textContent = itemName;
}


const onKeyDown = async (ev: KeyboardEvent): Promise<void> => {
    const pressedCtrlShiftF = (ev.code === 'KeyF' && ev.ctrlKey && ev.shiftKey && !ev.metaKey && !ev.altKey);
    const pressedEscape = (ev.code === 'Escape' && !ev.ctrlKey && !ev.shiftKey && !ev.metaKey && !ev.altKey);

    if (currentMode === Mode.Inactive && pressedCtrlShiftF) {
        stopPropagation(ev);
        ev.preventDefault();
        currentComponentsMap = await createComponentsMap();

        currentMode = Mode.Active;
        applyStyle(uiElements.overlay, {
            borderWidth: '50vh 50vw',
            display: 'block'
        });
        hideSettingsForm();
        setTimeout(() => { if (currentMode === Mode.Active || currentMode === Mode.Locked) uiElements.overlay.style.opacity = '1'; }, 1);
        setSourceNameTip("", "");
        currentScope = NULL;
        currentScopeElements = [];
        currentScopeRect = NULL;
    }
    else if ((currentMode === Mode.Active || currentMode === Mode.Locked) && (pressedEscape || pressedCtrlShiftF)) {
        stopPropagation(ev);
        ev.preventDefault();

        currentMode = pressedCtrlShiftF ? Mode.Inactive : (currentMode === Mode.Locked ? Mode.Active : Mode.Inactive);
        updateUIeffects(Mode.Active);
        uiElements.sourceNameTip.style.display = none;
        uiElements.overlay.style.borderWidth = '50vh 50vw';
        hideSettingsForm();

        if (currentMode === Mode.Inactive) {
            currentComponentsMap = [];
            uiElements.overlay.style.opacity = '0';
            setTimeout(() => { if (currentMode === Mode.Inactive) uiElements.overlay.style.display = none; }, 200);
        }
    }
}

const overlay_onMouseMove = async (ev: MouseEvent): Promise<void> => {
    if (currentMode !== Mode.Active) return;
    detectTargetAndDisplayIt(ev);
}

const overlay_onClick = (ev: MouseEvent): void => {
    hideSettingsForm();
    if (currentMode === Mode.Active) {
        if (currentScope && lastDetectedRazorSource && lastDetectedRazorSource !== NotFound) {
            currentMode = Mode.Locked;
            updateUIeffects(Mode.Locked);
            const event = new Event(RazorSourceEventNames.LockIn, { bubbles: false, cancelable: false }) as RazorSourceEvent;
            event.razorSourceName = lastDetectedRazorSource;
            doc.dispatchEvent(event);

            // Open in a VSCode.
            if (options.openInVSCode) {
                window.location.href = `vscode://file/${lastDetectedRazorSource.fullPath}`;
            }
        }
    }
    else if (currentMode === Mode.Locked) {
        currentMode = Mode.Active;
        updateUIeffects(Mode.Active);
        detectTargetAndDisplayIt(ev);
    }
}

const sourceNameTip_onClick = (ev: MouseEvent): void => {
    stopPropagation(ev);
    if (currentMode === Mode.Active) {
        overlay_onClick(ev);
    }
}

const settingsButton_onClick = (ev: MouseEvent): void => {
    stopPropagation(ev);
    if (isHiddenSettingsForm()) showSettingsForm();
    else hideSettingsForm();
}

const showSettingsForm = (): CSSStyleDeclaration => Object.assign(uiElements.settingsForm.style, { opacity: '1', bottom: '48px', pointerEvents: 'unset' });

const hideSettingsForm = (): CSSStyleDeclaration => Object.assign(uiElements.settingsForm.style, { opacity: '0', bottom: '0', pointerEvents: none });

const isHiddenSettingsForm = (): boolean => uiElements.settingsForm.style.opacity === '0';

const settingsOpenInVSCode_onClick = (ev: MouseEvent): void => {
    stopPropagation(ev);
    options.openInVSCode = uiElements.settingsOpenInVSCode.checked;
    saveOptionsFromLocalStorage();
}

const detectTargetAndDisplayIt = async (ev: MouseEvent): Promise<void> => {
    const result = await detectScope(ev);
    if (result.scopeHasChanged === false) return;
    lastDetectedRazorSource = await getRazorSourceName(result);
    displayScopeMask(result.scopeRect, lastDetectedRazorSource);
}

const detectScope = async (ev: MouseEvent): Promise<DetectedScopeResult> => {

    // Try to find scope information from the CSS scope attribute of the element under the mouse cursor.

    const sourceNameTipVisibility = uiElements.sourceNameTip.style.visibility;
    uiElements.sourceNameTip.style.visibility = 'hidden';
    uiElements.overlay.style.visibility = 'hidden';
    const hovered = doc.elementFromPoint(ev.clientX, ev.clientY);
    uiElements.overlay.style.visibility = 'visible';
    uiElements.sourceNameTip.style.visibility = sourceNameTipVisibility;

    let scope: string | null = NULL;
    let scopeRect: Rect | null = NULL;
    let scopeSource: RazorSourceName | null = NULL;
    let scopeElements: Node[] = [];
    let topElement: Node | null = NULL;
    for (let element = hovered; element; element = element.parentElement) {
        if (!scope) {
            scope = await getScope(element);
            if (scope) topElement = element;
        }
        else {
            if (scope === await getScope(element)) topElement = element;
        }
    }

    if (scope && topElement) {
        scopeElements = [topElement];
        scopeRect = (currentScope === scope ? currentScopeRect : NULL) || getScopeRect(topElement);
        scopeSource = await getRazorSourceName(scope);
    }

    // Also try to find scope information from the explicit markers of "FindRazorSourceFile" in the DOM tree.

    const hoveredComponentMap = currentComponentsMap.filter(c => isPointerInRect(ev, c.rect())).sort((a, b) => b.depth - a.depth)[0];

    // Merge the scope information from the CSS scope attribute and the explicit markers.
    if (hoveredComponentMap) {
        let shouldUseComponentMap = false;
        if (!scope) {
            shouldUseComponentMap = true;
        }
        else if (topElement && scopeSource) {
            if (scopeSource !== NotFound && scopeSource.itemName === hoveredComponentMap.source.itemName) {
                scopeRect = combineRects([scopeRect || MaxRect, hoveredComponentMap.rect()]);
                scopeElements = [topElement, ...hoveredComponentMap.elements];
            }
            else {
                if (getDepth(topElement) < hoveredComponentMap.depth) {
                    shouldUseComponentMap = true;
                }
            }
        }

        if (shouldUseComponentMap) {
            scope = hoveredComponentMap.hash;
            scopeElements = hoveredComponentMap.elements;
            scopeRect = hoveredComponentMap.rect();
            scopeSource = hoveredComponentMap.source;
        }
    }

    // if scope not found, re-check the mouse cursor is in current rect, and if it's true then keep current scope.
    if (!scope || !scopeRect) {
        if (isPointerInRect(ev, currentScopeRect)) {
            return { scope: currentScope, scopeRect: currentScopeRect, scopeHasChanged: false };
        }
    }

    // else, next scope is found and current scope is also available...
    else if (currentScope && currentScope !== scope && currentScopeRect) {
        // ...and the mouse cursor is still in the current rect...
        if (isPointerInRect(ev, currentScopeRect)) {
            // if the current rect is included the next rect, then keep current scope.
            if (scopeRect.left < currentScopeRect.left &&
                scopeRect.right > currentScopeRect.right &&
                scopeRect.top < currentScopeRect.top &&
                scopeRect.bottom > currentScopeRect.bottom
            ) {
                return { scope: currentScope, scopeRect: currentScopeRect, scopeHasChanged: false };
            }
        }
    }

    const scopeHasChanged = currentScope !== scope;
    if (scopeHasChanged) {
        currentScope = scope;
        currentScopeElements = scopeElements;
        currentScopeRect = scopeRect;
    }

    return { scope: currentScope, scopeRect: currentScopeRect, scopeHasChanged, source: scopeSource };
}

const getScope = async (element: Element): Promise<string | null> => {
    const scope = element.getAttributeNames().filter(name => name.startsWith('b-'))[0] || NULL;
    const reazorSourceName = await getRazorSourceName(scope);
    if (!reazorSourceName || reazorSourceName === NotFound) return NULL;
    return scope;
}

const getRazorSourceName = async (arg: string | DetectedScopeResult | null): Promise<RazorSourceName | null> => {

    if (arg && typeof arg !== 'string' && arg.source) return arg.source;
    const scope = typeof arg === 'string' ? arg : arg?.scope || NULL;
    if (!scope) return NULL;

    let razorSourceName = razorSourceMap[scope] || NULL;
    if (razorSourceName) return razorSourceName;

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
}

const displayScopeMask = (scopeRect: Rect | null, razorSourceName: RazorSourceName | null): void => {
    if (!scopeRect || !razorSourceName || razorSourceName === NotFound) {
        uiElements.sourceNameTip.style.display = none;
        uiElements.overlay.style.borderWidth = '50vh 50vw';
        return;
    }

    const overlayRect = uiElements.overlay.getBoundingClientRect();

    const bottomWidth = overlayRect.height - scopeRect.bottom;
    const rightWidth = overlayRect.width - scopeRect.right;
    applyStyle(uiElements.overlay, {
        borderStyle: 'solid',
        borderTopWidth: scopeRect.top > 0 ? scopeRect.top + 'px' : 0,
        borderLeftWidth: scopeRect.left > 0 ? scopeRect.left + 'px' : 0,
        borderBottomWidth: bottomWidth > 0 ? bottomWidth + 'px' : 0,
        borderRightWidth: rightWidth > 0 ? rightWidth + 'px' : 0
    });

    setSourceNameTip(razorSourceName.projectName, razorSourceName.itemName);
    uiElements.sourceNameTip.style.display = 'block';
}

const getScopeRect = (element: Node): Rect => {

    const getLogicalNodes = (element: Node): [Node | null, Node[]] => {
        const empty: [Node | null, Node[]] = [NULL, []];
        if (!logicalNodeParentKey || !logicalNodeChildrenKey) return empty;
        const logicalNodeParent = element[logicalNodeParentKey];
        const logicalNodeChildren = element[logicalNodeChildrenKey];
        if (isArray(logicalNodeParent) || !logicalNodeParent) return empty;
        if (!isArray(logicalNodeChildren) || !logicalNodeChildren) return empty;
        return [logicalNodeParent, logicalNodeChildren];
    };

    const getChildren = (element: Node): Node[] => {
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

    const getRect = (children: Node[]): Rect => combineRects(children.map(e =>
        (e.nodeType === ELEMENT_NODE) ? (e as HTMLElement).getBoundingClientRect() :
            (e.nodeType === COMMENT_NODE) ? getRect(getLogicalNodes(e)[1]) : MaxRect));

    return getRect(getChildren(element));
}

const window_onResize = (ev: UIEvent): void => {
    if (currentMode === Mode.Inactive) return;
    if (!currentScope || !currentScopeRect) return;
    if (!lastDetectedRazorSource || lastDetectedRazorSource === NotFound) return;

    currentScopeRect = combineRects(currentScopeElements.map(e => getScopeRect(e)));
    displayScopeMask(currentScopeRect, lastDetectedRazorSource);
}

const window_onStorage = (ev: StorageEvent): void => loadOptionsFromLocalStorage();

const saveOptionsFromLocalStorage = (): void => {
    const optionString = JSON.stringify(options);
    localStorage.setItem(FindRazorSourceFileClientOptionsKey, optionString);
}

const loadOptionsFromLocalStorage = (): void => {
    const optionString = localStorage.getItem(FindRazorSourceFileClientOptionsKey);
    Object.assign(options, JSON.parse(optionString || '{}'));
    uiElements.settingsOpenInVSCode.checked = options.openInVSCode;
}