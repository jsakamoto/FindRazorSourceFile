interface UIElements {
    overlay: HTMLElement;
    sourceNameTip: HTMLElement;
}

interface RazorSourceNameType {
    projectName: string;
    itemName: string;
}
type RazorSourceName = RazorSourceNameType | 'NotFound';
const NotFound = 'NotFound';

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

var elements: UIElements;
var lastDetectedRazorSource: RazorSourceName | null = null;
var currentScope: string | null = null;
var currentScopeRect: Rect | null = null;

const razorSourceMap: { [key: string]: RazorSourceName | undefined } = {};
var currentMode: Mode = Mode.Inactive;

export function init(name: string) {
    elements = createElements();
    updateUIeffects(Mode.Active);

    elements.overlay.addEventListener('mousemove', ev => overlay_onMouseMove(ev));
    elements.overlay.addEventListener('click', ev => overlay_onClick(ev));

    elements.sourceNameTip.addEventListener('mousemove', ev => ev.stopPropagation());
    elements.sourceNameTip.addEventListener('click', ev => sourceNameTip_onClick(ev));

    document.addEventListener('keydown', ev => onKeyDown(ev));
}

function createElements(): UIElements {
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

function updateUIeffects(mode: Mode.Active | Mode.Locked): void {
    const overlayOpacity = mode === Mode.Active ? 0.3 : 0.5;
    const sourcetipOpacity = mode === Mode.Active ? '0.8' : '1.0';
    elements.overlay.style.borderColor = `rgba(0, 0, 0, ${overlayOpacity})`;
    elements.overlay.style.boxShadow = `inset rgb(0, 0, 0, ${overlayOpacity}) 0px 0px 6px 4px`;
    elements.sourceNameTip.style.opacity = sourcetipOpacity;
}

function onKeyDown(ev: KeyboardEvent): void {
    if (currentMode === Mode.Inactive && ev.code === 'KeyF' && ev.ctrlKey && ev.shiftKey && !ev.metaKey && !ev.altKey) {
        ev.stopPropagation();
        ev.preventDefault();

        currentMode = Mode.Active;
        elements.overlay.style.borderWidth = '50vh 50vw';
        elements.overlay.style.display = 'block';
        setTimeout(() => { if (currentMode === Mode.Active || currentMode === Mode.Locked) elements.overlay.style.opacity = '1'; }, 1);
        elements.sourceNameTip.textContent = '';
        currentScope = null;
        currentScopeRect = null;
    }
    else if ((currentMode === Mode.Active || currentMode === Mode.Locked) && ev.code === 'Escape' && !ev.ctrlKey && !ev.shiftKey && !ev.metaKey && !ev.altKey) {
        ev.stopPropagation();
        ev.preventDefault();

        currentMode = currentMode === Mode.Locked ? Mode.Active : Mode.Inactive;
        updateUIeffects(Mode.Active);
        elements.sourceNameTip.style.display = 'none';
        elements.overlay.style.borderWidth = '50vh 50vw';

        if (currentMode === Mode.Inactive) {
            elements.overlay.style.opacity = '0';
            setTimeout(() => { if (currentMode === Mode.Inactive) elements.overlay.style.display = 'none'; }, 200);
        }
    }
}

async function overlay_onMouseMove(ev: MouseEvent): Promise<void> {
    if (currentMode !== Mode.Active) return;
    detectTargetAndDisplayIt(ev);
}

function overlay_onClick(ev: MouseEvent): void {
    if (currentMode === Mode.Active) {
        if (currentScope !== null && lastDetectedRazorSource !== null && lastDetectedRazorSource !== NotFound) {
            currentMode = Mode.Locked;
            updateUIeffects(Mode.Locked);
            const event = new Event(RazorSourceEventNames.LockIn, { bubbles: false, cancelable: false }) as RazorSourceEvent;
            event.razorSourceName = lastDetectedRazorSource;
            document.dispatchEvent(event);
        }
    }
    else if (currentMode === Mode.Locked) {
        currentMode = Mode.Active;
        updateUIeffects(Mode.Active);
        detectTargetAndDisplayIt(ev);
    }
}

function sourceNameTip_onClick(ev: MouseEvent): void {
    ev.stopPropagation();
    if (currentMode === Mode.Active) {
        overlay_onClick(ev);
    }
}

async function detectTargetAndDisplayIt(ev: MouseEvent): Promise<void> {
    const result = detectScope(ev);
    if (result.scopeHasChanged === false) return;
    lastDetectedRazorSource = await getRazorSourceName(result.scope);
    displayScopeMask(result.scopeRect, lastDetectedRazorSource);
}

function detectScope(ev: MouseEvent): { scope: string | null, scopeRect: Rect | null, scopeHasChanged: boolean } {
    elements.overlay.style.visibility = 'hidden';
    const hovered = document.elementFromPoint(ev.clientX, ev.clientY);
    elements.overlay.style.visibility = 'visible';

    let scope: string | null = null;
    for (var nearestTarget = hovered; nearestTarget !== null; nearestTarget = nearestTarget.parentElement) {
        scope = getScope(nearestTarget);
        if (scope !== null) break;
    }
    let nextScopeRect: Rect | null = null;

    // if scope not found, re-check the mouse cursor is in current rect, and if it's true then keep current scope.
    if (scope === null) {
        if (currentScopeRect !== null) {
            if (currentScopeRect.left < ev.clientX && ev.clientX < currentScopeRect.right &&
                currentScopeRect.top < ev.clientY && ev.clientY < currentScopeRect.bottom
            ) {
                return { scope: currentScope, scopeRect: currentScopeRect, scopeHasChanged: false };
            }
        }
    }

    // else, next scope is found and current scope is also available...
    else if (currentScope !== null && currentScope !== scope && currentScopeRect !== null) {
        // ...and the mouse cursor is still in the current rect...
        if (currentScopeRect.left < ev.clientX && ev.clientX < currentScopeRect.right &&
            currentScopeRect.top < ev.clientY && ev.clientY < currentScopeRect.bottom
        ) {
            // if the current rect is included the next rect, then keep current scope.
            nextScopeRect = getScopeRect(scope);
            if (nextScopeRect.left < currentScopeRect.left &&
                nextScopeRect.right > currentScopeRect.right &&
                nextScopeRect.top < currentScopeRect.top &&
                nextScopeRect.bottom > currentScopeRect.bottom
            ) {
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

function getScope(element: Element): string | null {
    return element.getAttributeNames().filter(name => name.startsWith('b-'))[0] || null;
}

async function getRazorSourceName(scope: string | null): Promise<RazorSourceName | null> {
    if (scope === null) return null;

    let razorSourceName = razorSourceMap[scope] || null;
    if (razorSourceName !== null) return razorSourceName;

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

function displayScopeMask(scopeRect: Rect | null, razorSourceName: RazorSourceName | null): void {
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

function getScopeRect(scope: string | null): Rect {
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
