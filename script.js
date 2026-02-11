// --- DOM Elements ---
const currentDisplay = document.getElementById('current-value');
const prevDisplay = document.getElementById('prev-operation');
const backspaceBtn = document.getElementById('backspace-btn');
const acBtn = document.getElementById('ac-btn');
const portalView = document.getElementById('portal');
const closePortal = document.getElementById('close-portal');
const fileUpload = document.getElementById('file-upload');
const portalContent = document.getElementById('portal-content');
const breadcrumb = document.getElementById('breadcrumb');
const contextMenu = document.getElementById('context-menu');
const folderPicker = document.getElementById('folder-picker');
const youtubeBannerContainer = document.getElementById('youtube-banner-container');
const youtubeBanner = document.getElementById('youtube-banner');

// --- State ---
let currentOperand = '0';
let previousOperand = '';
let operation = undefined;
let shouldResetDisplay = false;

let portalHoldTimer;
let acHoldTimer;
let itemHoldTimer;
let currentFolderId = 'root';
let selectedItemId = null;
let isBannerMinimized = false;

// --- Calculator Logic ---
function updateDisplay() {
    currentDisplay.innerText = currentOperand.replace('.', ',');
    prevDisplay.innerText = (operation != null) ? `${previousOperand} ${operation}` : '';
}

function appendNumber(number) {
    if (number === '.' && currentOperand.includes('.')) return;
    if (currentOperand === '0' || shouldResetDisplay) {
        currentOperand = number;
        shouldResetDisplay = false;
    } else {
        currentOperand += number;
    }
}

function chooseOperation(op) {
    if (currentOperand === '') return;
    if (previousOperand !== '') compute();
    operation = op;
    previousOperand = currentOperand;
    shouldResetDisplay = true;
}

function compute() {
    // Secret Wipe Command: 7777 =
    if (currentOperand === '7777') {
        localStorage.removeItem('portal_db');
        location.reload();
        return;
    }

    let computation;
    const prev = parseFloat(previousOperand);
    const current = parseFloat(currentOperand);
    if (isNaN(prev) || isNaN(current)) return;
    switch (operation) {
        case '+': computation = prev + current; break;
        case '-': computation = prev - current; break;
        case '*': computation = prev * current; break;
        case '/': computation = prev / current; break;
        default: return;
    }
    currentOperand = computation.toString();
    operation = undefined;
    previousOperand = '';
}

function clear() {
    currentOperand = '0';
    previousOperand = '';
    operation = undefined;
}

function deleteLast() {
    currentOperand = (currentOperand.length > 1) ? currentOperand.slice(0, -1) : '0';
}

function toggleSign() { currentOperand = (parseFloat(currentOperand) * -1).toString(); }
function percent() { currentOperand = (parseFloat(currentOperand) / 100).toString(); }

document.querySelectorAll('[data-value]').forEach(btn => btn.addEventListener('click', () => { appendNumber(btn.dataset.value); updateDisplay(); }));
document.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', () => {
    switch (btn.dataset.action) {
        case 'clear': clear(); break;
        case 'backspace': deleteLast(); break;
        case 'operator': chooseOperation(btn.dataset.value); break;
        case 'calculate': compute(); break;
        case 'toggle-sign': toggleSign(); break;
        case 'percent': percent(); break;
    }
    updateDisplay();
}));

// --- Portal Reveal (2s Backspace Hold) ---
function startPortalHold() {
    backspaceBtn.classList.add('holding');
    portalHoldTimer = setTimeout(() => {
        backspaceBtn.classList.remove('holding');
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
        portalView.classList.add('active');
        renderPortal();
    }, 2000);
}
function endPortalHold() { backspaceBtn.classList.remove('holding'); clearTimeout(portalHoldTimer); }

backspaceBtn.addEventListener('mousedown', startPortalHold);
backspaceBtn.addEventListener('touchstart', startPortalHold);
backspaceBtn.addEventListener('mouseup', endPortalHold);
backspaceBtn.addEventListener('mouseleave', endPortalHold);
backspaceBtn.addEventListener('touchend', endPortalHold);
backspaceBtn.addEventListener('touchcancel', endPortalHold);

closePortal.addEventListener('click', () => portalView.classList.remove('active'));

// --- AC Long Press Shortcut (Telegram Web) ---
function startAcHold() {
    acHoldTimer = setTimeout(() => {
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.openLink('https://web.telegram.org');
        } else {
            window.open('https://web.telegram.org', '_blank');
        }
    }, 2000);
}
function endAcHold() { clearTimeout(acHoldTimer); }

if (acBtn) {
    acBtn.addEventListener('mousedown', startAcHold);
    acBtn.addEventListener('touchstart', startAcHold);
    acBtn.addEventListener('mouseup', endAcHold);
    acBtn.addEventListener('mouseleave', endAcHold);
    acBtn.addEventListener('touchend', endAcHold);
    acBtn.addEventListener('touchcancel', endAcHold);
}

// --- Media & Folder Logic ---
function getDb() {
    return JSON.parse(localStorage.getItem('portal_db') || '{"files": [], "folders": []}');
}
function saveDb(db) { localStorage.setItem('portal_db', JSON.stringify(db)); renderPortal(); }

fileUpload.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    const db = getDb();
    for (const file of files) {
        const reader = new FileReader();
        reader.onload = (event) => {
            db.files.push({
                id: Date.now() + Math.random(),
                name: file.name,
                type: file.type,
                data: event.target.result,
                folderId: currentFolderId
            });
            saveDb(db);
        };
        reader.readAsDataURL(file);
    }
});

function renderPortal() {
    const db = getDb();
    portalContent.innerHTML = '';

    // Breadcrumbs
    breadcrumb.innerHTML = '<span data-folder="root">Portal</span>';
    if (currentFolderId !== 'root') {
        const path = [];
        let cur = db.folders.find(f => f.id === currentFolderId);
        while (cur) {
            path.unshift(cur);
            cur = db.folders.find(f => f.id === cur.parentId);
        }
        path.forEach(f => {
            breadcrumb.innerHTML += ` / <span data-folder="${f.id}">${f.name}</span>`;
        });
    }
    breadcrumb.querySelectorAll('span').forEach(s => s.addEventListener('click', () => {
        currentFolderId = s.dataset.folder;
        renderPortal();
    }));

    // Folders
    const folders = db.folders.filter(f => f.parentId === currentFolderId);
    folders.forEach(folder => {
        const div = document.createElement('div');
        div.className = 'folder-item';
        div.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg><div class="folder-name">${folder.name}</div>`;
        addLongPress(div, folder.id, true);
        div.addEventListener('click', () => { currentFolderId = folder.id; renderPortal(); });
        portalContent.appendChild(div);
    });

    // Files
    const files = db.files.filter(f => f.folderId === currentFolderId);
    files.forEach(file => {
        const div = document.createElement('div');
        div.className = 'media-item';
        let preview = '';
        if (file.type.startsWith('image/')) preview = `<img src="${file.data}">`;
        else if (file.type.startsWith('video/')) preview = `<video src="${file.data}"></video><div class="type-icon">▶</div>`;
        else if (file.type.startsWith('audio/')) preview = `<div class="audio-placeholder">🎵</div>`;
        else preview = `<div class="file-placeholder">📄</div>`;

        div.innerHTML = preview;
        addLongPress(div, file.id, false);
        div.addEventListener('click', () => playMedia(file));
        portalContent.appendChild(div);
    });

    if (folders.length === 0 && files.length === 0) {
        portalContent.innerHTML = '<div class="empty-state"><p>Empty here. Upload files or hold to create folder.</p></div>';
    }
}

// --- Long Press & Context Menu ---
function addLongPress(el, id, isFolder) {
    el.addEventListener('mousedown', () => startItemHold(id, isFolder));
    el.addEventListener('touchstart', (e) => { startItemHold(id, isFolder); });
    el.addEventListener('mouseup', endItemHold);
    el.addEventListener('touchend', endItemHold);
}

function startItemHold(id, isFolder) {
    itemHoldTimer = setTimeout(() => {
        selectedItemId = id;
        showContextMenu(isFolder);
    }, 600);
}
function endItemHold() { clearTimeout(itemHoldTimer); }

function showContextMenu(isFolder) {
    contextMenu.style.display = 'flex';
    document.getElementById('ctx-move').style.display = isFolder ? 'none' : 'block';
}

function closeContextMenus() {
    contextMenu.style.display = 'none';
    folderPicker.style.display = 'none';
}

document.getElementById('ctx-cancel').addEventListener('click', closeContextMenus);
document.getElementById('ctx-delete').addEventListener('click', () => {
    const db = getDb();
    db.files = db.files.filter(f => f.id !== selectedItemId);
    db.folders = db.folders.filter(f => f.id !== selectedItemId);
    saveDb(db);
    closeContextMenus();
});

document.getElementById('ctx-create-folder').addEventListener('click', () => {
    const name = prompt("Назовите папку:");
    if (name) {
        const db = getDb();
        db.folders.push({ id: Date.now(), name, parentId: currentFolderId });
        saveDb(db);
    }
    closeContextMenus();
});

document.getElementById('ctx-move').addEventListener('click', () => {
    const db = getDb();
    const list = document.getElementById('folder-list');
    list.innerHTML = '<div class="folder-option" data-id="root">Root</div>';
    db.folders.forEach(f => {
        list.innerHTML += `<div class="folder-option" data-id="${f.id}">${f.name}</div>`;
    });
    contextMenu.style.display = 'none';
    folderPicker.style.display = 'flex';

    list.querySelectorAll('.folder-option').forEach(opt => opt.addEventListener('click', () => {
        const file = db.files.find(f => f.id === selectedItemId);
        if (file) {
            file.folderId = opt.dataset.id;
            saveDb(db);
        }
        closeContextMenus();
    }));
});

document.getElementById('picker-cancel').addEventListener('click', closeContextMenus);

// --- Swipe Logic for Banner ---
let startY;
youtubeBannerContainer.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; });
youtubeBannerContainer.addEventListener('touchend', (e) => {
    const endY = e.changedTouches[0].clientY;
    const diff = endY - startY;
    if (diff > 50) { // Swipe down to hide
        isBannerMinimized = true;
        youtubeBannerContainer.style.transform = 'translate(-50%, calc(100% - 20px))';
    } else if (diff < -50) { // Swipe up to show
        isBannerMinimized = false;
        youtubeBannerContainer.style.transform = 'translate(-50%, 0)';
    }
});

youtubeBanner.addEventListener('click', () => {
    if (isBannerMinimized) {
        isBannerMinimized = false;
        youtubeBannerContainer.style.transform = 'translate(-50%, 0)';
        return;
    }
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.openLink("https://www.youtube.com");
    } else {
        window.open("https://www.youtube.com", "_blank");
    }
});

function playMedia(file) {
    const win = window.open("", "_blank");
    let content = '';
    if (file.type.startsWith('image/')) content = `<img src="${file.data}" style="max-width:100%;">`;
    else if (file.type.startsWith('video/')) content = `<video src="${file.data}" controls autoplay style="max-width:100%;"></video>`;
    else if (file.type.startsWith('audio/')) content = `<audio src="${file.data}" controls autoplay></audio>`;
    win.document.write(`<body style="background:black;display:flex;align-items:center;justify-content:center;margin:0;">${content}</body>`);
}

// Init
updateDisplay();
renderPortal();
