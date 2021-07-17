interface UIElements {
    overlay: HTMLElement;
    targetMask: HTMLElement;
    sourceNameTip: HTMLElement;
}

interface RazorSourceNameType {
    projectName: string;
    itemName: string;
}
type RazorSourceName = RazorSourceNameType | 'NotFound';

const NotFound = 'NotFound';

var elements: UIElements;
var lastHovered: Element | null = null;
var lastDetectedTarget: Element | null = null;
var lastDetectedScope: string | null = null;
const razorSourceMap: { [key: string]: RazorSourceName | undefined } = {};

export function init(name: string) {
    elements = createElements();
    elements.overlay.addEventListener('mousemove', ev => overlay_onMouseMove(ev));
}

function createElements(): UIElements {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.bottom = '0';
    overlay.style.right = '0';
    overlay.style.zIndex = '9999';
    overlay.style.backgroundColor = 'transparent';//'rgba(0, 0, 0, 0.2)';
    document.body.appendChild(overlay);

    const targetMask = document.createElement('div');
    targetMask.style.position = 'absolute';
    targetMask.style.top = '0';
    targetMask.style.left = '0';
    targetMask.style.width = '0';
    targetMask.style.height = '0';
    targetMask.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    targetMask.style.outline = 'solid 2px cyan';
    targetMask.style.display = 'none';
    overlay.appendChild(targetMask);

    const sourceNameTip = document.createElement('div');
    sourceNameTip.style.position = 'absolute';
    sourceNameTip.style.top = '0';
    sourceNameTip.style.left = '0';
    sourceNameTip.style.color = '#111';
    sourceNameTip.style.fontFamily = 'sans-serif';
    sourceNameTip.style.fontSize = '12px';
    sourceNameTip.style.padding = '2px 6px';
    sourceNameTip.style.backgroundColor = '#ffc107';
    sourceNameTip.style.boxShadow = '2px 2px 4px 0px rgb(0, 0, 0, 0.5)';
    sourceNameTip.style.whiteSpace = 'nowrap';
    sourceNameTip.textContent = 'HELLO WORLD';
    sourceNameTip.style.display = 'none';
    targetMask.appendChild(sourceNameTip);

    return { overlay, targetMask, sourceNameTip };
}

async function overlay_onMouseMove(ev: MouseEvent): Promise<void> {
    const result = detectTarget(ev);

    if (result.targetHasChanged === false) return;
    console.log(result);

    const razorSourceName = await getRazorSourceName(result.scope);
    displayTargetMask(result.target, razorSourceName);
}

function detectTarget(ev: MouseEvent): { target: Element | null, scope: string | null, targetHasChanged: boolean } {
    elements.overlay.style.visibility = 'hidden';
    const hovered = document.elementFromPoint(ev.clientX, ev.clientY);
    elements.overlay.style.visibility = 'visible';

    if (hovered === lastHovered) return { target: lastDetectedTarget, scope: lastDetectedScope, targetHasChanged: false };
    lastHovered = hovered;

    let scope: string | null = null;
    let target: Element | null = null;

    for (var nearestTarget = hovered; nearestTarget !== null; nearestTarget = nearestTarget.parentElement) {
        scope = getScope(nearestTarget);
        if (scope !== null) break;
    }

    if (nearestTarget != null && scope !== null) {
        target = nearestTarget;
        for (var t = nearestTarget.parentElement; t !== null; t = t.parentElement) {
            const parentScope = getScope(t);
            if (parentScope === null) continue;
            if (parentScope !== scope) break;
            target = t;
        }
    }

    const targetHasChanged = lastDetectedTarget !== target;
    lastDetectedTarget = target;
    lastDetectedScope = target === null ? null : scope;

    return { target: lastDetectedTarget, scope: lastDetectedScope, targetHasChanged };
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

function displayTargetMask(target: Element | null, razorSourceName: RazorSourceName | null): void {
    if (target === null || razorSourceName === null || razorSourceName === NotFound) {
        elements.targetMask.style.display = 'none';
        elements.sourceNameTip.style.display = 'none';
        return;
    }

    const rect = target.getBoundingClientRect();
    elements.targetMask.style.top = rect.top + 'px';
    elements.targetMask.style.left = rect.left + 'px';
    elements.targetMask.style.width = rect.width + 'px';
    elements.targetMask.style.height = rect.height + 'px';
    elements.targetMask.style.display = 'block';

    elements.sourceNameTip.textContent = `${razorSourceName.projectName} | ${razorSourceName.itemName}`;
    elements.sourceNameTip.style.display = 'block';
}
