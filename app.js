// Initialize Telegram WebApp
const tg = window.Telegram?.WebApp || {};

// Splash screen logic: wait for both minimum time AND full page load
let minTimeElapsed = false;
let pageLoaded = false;

function hideSplash() {
    const splash = document.getElementById('splashScreen');
    const app = document.getElementById('app');
    if (!splash) return;

    splash.classList.add('hidden');
    if (app) app.classList.remove('is-loading');

    const cleanup = () => splash.remove();
    splash.addEventListener('transitionend', cleanup, { once: true });
    setTimeout(cleanup, 600);
}

function checkSplashStatus() {
    if (minTimeElapsed && pageLoaded) {
        hideSplash();
    }
}

// Minimum display time (1600ms)
setTimeout(() => {
    minTimeElapsed = true;
    checkSplashStatus();
}, 1600);

// Full page load event
window.addEventListener('load', () => {
    pageLoaded = true;
    checkSplashStatus();
});

// Fallback: Force hide after 5 seconds no matter what
setTimeout(() => {
    if (!document.getElementById('splashScreen')?.classList.contains('hidden')) {
        hideSplash();
    }
}, 5000);

document.addEventListener('DOMContentLoaded', () => {
    // 1. Expand the app and request immersive fullscreen
    try {
        if (tg.expand) tg.expand();
        if (tg.requestFullscreen) tg.requestFullscreen();
        if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
        if (tg.setHeaderColor) tg.setHeaderColor('#0088cc');
        if (tg.setBackgroundColor) tg.setBackgroundColor('#050b1a');
    } catch (e) {
        console.warn('Telegram SDK not available:', e);
    }

    initUserData();
    initInventory();
    initCarousel();
    initScrollEffect();
    initModalGestures();
    initRewardModalGestures();
    initModalSlider();
    initCollectionsFilter(); 
    initMinting(); // New: Initialize minting listeners
    initGiftSystem(); // New: Initialize gift code system

    // Initial tab setup
    window.switchTab = switchTab;

    try { if (tg.ready) tg.ready(); } catch (e) { }
});

/**
 * Tab Switching Logic
 */
let tabScrollPositions = {
    voco: 0,
    creators: 0
};
let currentTab = 'voco';

function switchTab(tabId) {
    if (tabId === currentTab) return;

    const vocoTab = document.getElementById('vocoTab');
    const creatorsTab = document.getElementById('creatorsTab');
    const btnVoco = document.getElementById('tabVoco');
    const btnCreators = document.getElementById('tabCreators');
    const indicator = document.getElementById('navIndicator');

    // 1. Save current scroll position
    tabScrollPositions[currentTab] = window.scrollY;

    if (tabId === 'voco') {
        vocoTab.classList.add('active');
        creatorsTab.classList.remove('active');
        btnVoco.classList.add('active');
        btnCreators.classList.remove('active');
        document.body.classList.remove('creators-active');
        if (indicator) indicator.style.transform = 'translateX(0%)';
    } else if (tabId === 'creators') {
        vocoTab.classList.remove('active');
        creatorsTab.classList.add('active');
        btnVoco.classList.remove('active');
        btnCreators.classList.add('active');
        document.body.classList.add('creators-active');
        if (indicator) indicator.style.transform = 'translateX(100%)';
    }

    // 2. Update current tab
    currentTab = tabId;

    // 3. Restore scroll position for the new tab
    // We use a tiny timeout to ensure the DOM has updated and layout is ready
    setTimeout(() => {
        window.scrollTo({
            top: tabScrollPositions[tabId],
            behavior: 'instant'
        });
    }, 0);

    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

/**
 * Handle top blur overlay on scroll
 */
function initScrollEffect() {
    const overlay = document.getElementById('scrollOverlay');
    window.addEventListener('scroll', () => {
        const scrollPos = window.scrollY;
        // Fade in over 100px of scroll
        const opacity = Math.min(scrollPos / 100, 1);
        overlay.style.opacity = opacity;
    });
}

/**
 * Initialize User Data from Telegram
 */
function initUserData() {
    const user = tg.initDataUnsafe?.user;
    const userPhotoImg = document.getElementById('userPhoto');
    const userPhotoLarge = document.getElementById('userPhotoLarge');
    const userName = document.getElementById('userName');
    const userId = document.getElementById('userId');
    const ownerName = document.getElementById('ownerName');

    if (user) {
        if (user.photo_url) {
            if (userPhotoImg) userPhotoImg.src = user.photo_url;
            if (userPhotoLarge) userPhotoLarge.src = user.photo_url;

            const rewardUserPhoto = document.getElementById('rewardUserPhoto');
            if (rewardUserPhoto) rewardUserPhoto.src = user.photo_url;

            const navUserPhoto = document.getElementById('navUserPhoto');
            if (navUserPhoto) navUserPhoto.src = user.photo_url;
        }

        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';
        if (userName) userName.textContent = fullName;
        if (ownerName) ownerName.textContent = fullName;
        if (userId) userId.textContent = user.id || 'Unknown';

        // Handle Copy ID
        const copyBtn = document.getElementById('copyId');
        if (copyBtn && user.id) {
            copyBtn.onclick = () => {
                const idStr = user.id.toString();
                navigator.clipboard.writeText(idStr).then(() => {
                    tg.HapticFeedback.notificationOccurred('success');
                    if (userId) {
                        const originalText = userId.textContent;
                        userId.textContent = 'Copied!';
                        setTimeout(() => userId.textContent = originalText, 1000);
                    }
                });
            };
        }
    }
}

/**
 * Carousel logic for updating pagination dots
 */
function initCarousel() {
    const carousel = document.getElementById('collectionsCarousel');
    const dots = document.querySelectorAll('.dot');

    if (!carousel) return;

    carousel.onscroll = () => {
        const scrollPosition = carousel.scrollLeft;
        const cardWidth = carousel.querySelector('.pack-card').offsetWidth;
        const activeIndex = Math.round(scrollPosition / cardWidth);

        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === activeIndex);
        });
    };
}

/**
 * PHASE 2: Modal, Purchase and Inventory Logic
 */

const INVENTORY_KEY = 'voco_inventory';
const USED_CODES_KEY = 'voco_used_codes';

const allKittenStickers = [
    'Kitten/CAACAgIAAxUAAWn8ngkaS9tMy3lKuzIr40hAyubNAAK8iQAChGexS4oMmkGTCWnzOwQ.webp',
    'Kitten/CAACAgIAAxUAAWn8ngl0Uic8CPFn8PaNlxJiYMvfAALhjgACFSupS0M1XTEi-JfEOwQ.webp',
    'Kitten/CAACAgIAAxUAAWn8ngl7r-dZimllMsYM5Df_KmpYAALLhAACsX2oS9hrui4DeKoNOwQ.webp',
    'Kitten/CAACAgIAAxUAAWn8nglKGrtEu5_12GtTsCPlsE-CAAIqgAAC4SKwS3OD04mbQpy0OwQ.webp',
    'Kitten/CAACAgIAAxUAAWn8nglViygopzBLGP1ncUGJbqJxAAIimQACsBSpSzY51wAB1Vte7TsE.webp',
    'Kitten/CAACAgIAAxUAAWn8nglXfpjgdGBxk9cUmN-rdVlhAAL1rQACrKSpS1G2Zy6MJRKwOwQ.webp',
    'Kitten/CAACAgIAAxUAAWn8nglzg7EjC8t-OkDraKsuOsoJAAIEhAAC3p-wS8qBNPSHzJv5OwQ.webp',
    'Kitten/CAACAgIAAxUAAWn8ngm6t03GV5JHzRdbUN6fm0wRAALBngAC-A6pSxZ1haB1v15xOwQ.webp',
    'Kitten/CAACAgIAAxUAAWn8ngmeBwl1_yp9c9_WHlTa-XQwAAIhigAC6uqoS7oCGkyd2tf_OwQ.webp',
    'Kitten/CAACAgIAAxUAAWn8ngmgIgbykSXGFyC6BK35sNeEAAJbiQACksqpSzFIjsCS_wWBOwQ.webp',
    'Kitten/CAACAgIAAxUAAWn8ngmqZf5AJbl1S2LGjO1HRj3KAAJxmAACbbGpS5m7ONJOa_KyOwQ.webp',
    'Kitten/CAACAgIAAxUAAWn8ngmwZ32WyYWJc7pXbOq49SO8AAJhkgACRDapS1J3lQ223rAVOwQ.webp',
    'Kitten/CAACAgIAAxUAAWn8ngnBNZgjgtUo8knekJleUs9gAAL9nwACqsmpS3jKuSTGAyHXOwQ.webp',
    'Kitten/CAACAgIAAxUAAWn8ngnDhAABwrWBfzC2N3SFbJEq7QACbZgAAor0qEtsXHpThj8f6zsE.webp',
    'Kitten/CAACAgIAAxUAAWn8ngnU2O29CDm74uvXtPqCnCOaAALlgwACZBaoS_IaSnR-SYJoOwQ.webp',
    'Kitten/CAACAgIAAxkBAAEDuTZp_J393n7Qp-lKIQxVL_rGa2RqDQACsJIAAiG5qEtR64MguW7vITsE.webp'
];

const allVocoStickers = [
    'https://raw.githubusercontent.com/vovashmyhol/Voco-Stickers/refs/heads/main/Vatman.json',
    'https://raw.githubusercontent.com/vovashmyhol/Voco-Stickers/refs/heads/main/Choco.json',
    'https://raw.githubusercontent.com/vovashmyhol/Voco-Stickers/refs/heads/main/Pink.json',
    'https://raw.githubusercontent.com/vovashmyhol/Voco-Stickers/refs/heads/main/Sad.json'
];

let inventory = [];
let usedCodes = [];

/**
 * PHASE 2: Storage, Modal, Purchase and Inventory Logic
 */

// Helper to interact with CloudStorage via Promises
const storage = {
    get: (key) => new Promise((resolve) => {
        try {
            if (tg.CloudStorage) {
                tg.CloudStorage.getItem(key, (err, value) => {
                    if (err) {
                        console.error('CloudStorage Get Error:', err);
                        resolve(localStorage.getItem(key)); // Fallback
                    } else {
                        resolve(value);
                    }
                });
            } else {
                resolve(localStorage.getItem(key));
            }
        } catch (e) {
            resolve(localStorage.getItem(key));
        }
    }),
    set: (key, value) => new Promise((resolve) => {
        try {
            if (tg.CloudStorage) {
                tg.CloudStorage.setItem(key, value, (err, success) => {
                    if (err) console.error('CloudStorage Set Error:', err);
                    // Always update localStorage as well for redundancy/fallback
                    localStorage.setItem(key, value);
                    resolve(success);
                });
            } else {
                localStorage.setItem(key, value);
                resolve(true);
            }
        } catch (e) {
            localStorage.setItem(key, value);
            resolve(false);
        }
    })
};

async function initInventory() {
    const data = await storage.get(INVENTORY_KEY);
    const codesData = await storage.get(USED_CODES_KEY);
    try {
        inventory = data ? JSON.parse(data) : [];
        usedCodes = codesData ? JSON.parse(codesData) : [];
        console.log('Inventory loaded:', inventory);
    } catch (e) {
        inventory = [];
        usedCodes = [];
    }
    // Render inventory once loaded
    renderInventory();
}

const modal = document.getElementById('packModal');
const buyBtn = document.getElementById('buyBtn');
const priceValue = document.getElementById('priceValue');

// 1. Pack click handling (Open Modal)
document.getElementById('vocoPack').addEventListener('click', () => {
    tg.HapticFeedback.impactOccurred('medium');
    openPackModal('VocoX');
});

const kittenPack = document.getElementById('kittenPack');
if (kittenPack) {
    kittenPack.addEventListener('click', () => {
        tg.HapticFeedback.impactOccurred('medium');
        openPackModal('Kitten');
    });
}

let currentFilter = 'all';
let isCraftedFilterActive = false; // Toggle state: false = regular packs, true = crafted items

function handleFilterSelection(buttonId) {
    currentFilter = buttonId;
    const titleContainer = document.querySelector('#collectionsSelector .selector-content');
    if (titleContainer) {
        if (buttonId === 'all') {
            titleContainer.innerHTML = '<span class="selector-title">Collections</span>';
        } else if (buttonId === 'VocoX') {
            titleContainer.innerHTML = '<span class="selector-title">Vatman family</span><img src="verify.WEBP" alt="Verified" class="opt-icon-small" style="margin-left: 4px;">';
        } else if (buttonId === 'Kitten') {
            titleContainer.innerHTML = '<span class="selector-title">Kitten Pack</span>';
        } else if (buttonId === 'crafted') {
            titleContainer.innerHTML = '<img src="Mint.webp" alt="Crafted" class="opt-icon" style="width: 20px; height: 20px; margin-right: 8px;"><span class="selector-title">Crafted</span>';
        }
    }
    renderInventory();
}

function initCollectionsFilter() {
    const selector = document.getElementById('collectionsSelector');
    const dropdown = document.getElementById('collectionsDropdown');
    if (!selector || !dropdown) return;

    // Toggle dropdown
    selector.onclick = (e) => {
        e.stopPropagation();
        const isActive = selector.classList.contains('active');
        
        if (!isActive) {
            selector.classList.add('active');
            tg.HapticFeedback.impactOccurred('light');
        } else {
            selector.classList.remove('active');
        }
    };

    // Option selection
    dropdown.onclick = (e) => {
        const opt = e.target.closest('.filter-opt');
        if (opt) {
            e.stopPropagation();
            const filterId = opt.getAttribute('data-filter');
            
            // UI Updates
            document.querySelectorAll('.filter-opt').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            
            handleFilterSelection(filterId);
            
            tg.HapticFeedback.impactOccurred('medium');
            
            // Close after selection
            setTimeout(() => {
                selector.classList.remove('active');
            }, 150);
        }
    };

    // Global click-outside to close
    document.addEventListener('click', (e) => {
        if (selector.classList.contains('active') && !selector.contains(e.target) && !dropdown.contains(e.target)) {
            selector.classList.remove('active');
        }
    });

    // Crafted Toggle Logic
    const toggleBtn = document.getElementById('craftedToggle');
    if (toggleBtn) {
        toggleBtn.onclick = () => {
            isCraftedFilterActive = !isCraftedFilterActive;
            toggleBtn.classList.toggle('active', isCraftedFilterActive);
            tg.HapticFeedback.impactOccurred('medium');
            renderInventory();
        };
    }
}

function openProfile() {
    renderInventory();
    const profileView = document.getElementById('profileView');
    profileView.classList.add('active');
    document.body.classList.add('profile-active');

    // We don't change the active tab in the main bar when opening profile now
    // as it is a separate floating button.

    updateBackButton();
    initProfileElasticScroll(profileView);
}

function initProfileElasticScroll(profileView) {
    const headerBg = document.getElementById('profileHeaderBg');
    const starsBg = document.getElementById('profileStarsBg');

    profileView.onscroll = () => {
        const scrollTop = profileView.scrollTop;

        if (scrollTop < 0) {
            // Pulling down (Overscroll)
            const scale = 1 + Math.abs(scrollTop) / 500;
            const translate = Math.abs(scrollTop) / 2;
            headerBg.style.transform = `scale(${scale}) translateY(${translate}px)`;
            starsBg.style.transform = `scale(${scale}) translateY(${translate}px)`;
        } else {
            // Normal scrolling (Parallax)
            const translate = scrollTop * 0.4;
            headerBg.style.transform = `translateY(${-translate}px)`;
            starsBg.style.transform = `translateY(${-translate}px)`;
        }
    };
}

function closeProfile() {
    const profileView = document.getElementById('profileView');
    if (profileView) profileView.classList.remove('active');
    document.body.classList.remove('profile-active');

    // Restore active tab based on which one is active in the content
    const vocoTab = document.getElementById('vocoTab');
    if (vocoTab.classList.contains('active')) {
        switchTab('voco');
    } else {
        switchTab('creators');
    }

    updateBackButton();
}

/**
 * Global navigation handler for Telegram BackButton
 */
function updateBackButton() {
    const profileView = document.getElementById('profileView');
    const modalEl = document.getElementById('packModal');

    const isProfileActive = profileView && profileView.classList.contains('active');
    const isModalActive = modalEl && modalEl.classList.contains('active');

    if (isProfileActive || isModalActive) {
        tg.BackButton.show();
        tg.BackButton.offClick(handleBackAction);
        tg.BackButton.onClick(handleBackAction);
    } else {
        tg.BackButton.hide();
    }
}

function handleBackAction() {
    const modalEl = document.getElementById('packModal');
    const profileView = document.getElementById('profileView');

    const isModalActive = modalEl && modalEl.classList.contains('active');
    const isProfileActive = profileView && profileView.classList.contains('active');

    if (isModalActive) {
        closeModal();
    } else if (isProfileActive) {
        closeProfile();
    }
}

function renderInventory() {
    const grid = document.getElementById('inventoryGrid');
    const packCount = document.getElementById('packCount');
    if (!grid) return;

    grid.innerHTML = '';
    packCount.textContent = inventory.length;

    const getRarity = (gradClass) => {
        if (!gradClass) return 'Common';
        const num = parseInt(gradClass.replace('grad-', ''));
        if (gradClass === 'grad-14' || gradClass === 'grad-15') return 'Legendary';
        if (num >= 12) return 'Epic';
        if (num >= 8) return 'Rare';
        return 'Common';
    };

    // Show crown if 5 or more packs
    const profileCrown = document.querySelector('.user-crown');
    if (profileCrown) {
        if (inventory.length >= 5) {
            profileCrown.classList.add('visible');
        } else {
            profileCrown.classList.remove('visible');
        }
    }

    // Filter inventory based on selection and toggle state
    let displayInventory = inventory.filter(item => {
        // 1. Collection Filter
        const packId = typeof item === 'string' ? item : item.id;
        if (currentFilter !== 'all' && packId !== currentFilter) return false;

        // 2. Crafted Toggle Filter
        const isMinted = item.mintData ? true : false;
        return isMinted === isCraftedFilterActive;
    });

    if (displayInventory.length === 0) {
        // Render Empty State
        const emptyState = document.createElement('div');
        emptyState.className = 'inventory-empty-state';
        
        let emptyMsg = "";
        if (isCraftedFilterActive) {
            emptyMsg = currentFilter === 'all' ? "You don't have any crafted items yet" : `No crafted items in ${document.querySelector('#collectionsSelector .selector-title').textContent}`;
        } else {
            emptyMsg = currentFilter === 'all' ? "You don't have any packs yet" : `No packs in ${document.querySelector('#collectionsSelector .selector-title').textContent}`;
        }

        emptyState.innerHTML = `
            <div class="empty-lottie-container">
                <lottie-player 
                    src="https://raw.githubusercontent.com/vovashmyhol/Voco-Stickers/refs/heads/main/OffPack.json" 
                    background="transparent" 
                    speed="1" 
                    loop 
                    autoplay>
                </lottie-player>
            </div>
            <p class="empty-text">
                ${emptyMsg}
            </p>
            <button class="go-market-btn" id="goMarketBtn">Go to market</button>
        `;

        grid.style.display = 'block';
        grid.appendChild(emptyState);

        document.getElementById('goMarketBtn').addEventListener('click', () => {
            tg.HapticFeedback.impactOccurred('light');
            closeProfile();
        });
    } else {
        // Render Inventory Items
        grid.style.display = 'grid';
        displayInventory.forEach(itemData => {
            const packId = typeof itemData === 'string' ? itemData : itemData.id;
            const isMinted = itemData.mintData ? true : false;

            const isKitten = packId === 'Kitten';
            const item = document.createElement('div');
            item.className = isMinted ? 'inventory-item minted' : 'inventory-item';

            let itemContent = '';
            if (isMinted) {
                // Render Minted Card Style
                const m = itemData.mintData;
                const stickerSrc = m.src;
                
                const stickerElement = m.isLottie ? 
                    `<lottie-player src="${stickerSrc}" background="transparent" speed="1" style="width: 100%; height: 100%;"></lottie-player>` :
                    `<img src="${stickerSrc}" style="width: 100%; height: 100%; object-fit: contain;">`;

                const rarity = getRarity(m.gradientClass);

                item.innerHTML = `
                    <div class="inventory-sticker-container ${m.gradientClass}">
                        <div class="item-number">${rarity}</div>
                        ${stickerElement}
                    </div>
                    <div class="inventory-item-name">${isKitten ? 'Kitten' : 'Vatman'} #${m.serial}</div>
                `;
            } else {
                // Original Pack Style
                if (isKitten) {
                    itemContent = `<img src="Kitten/CAACAgIAAxUAAWn8ngkaS9tMy3lKuzIr40hAyubNAAK8iQAChGexS4oMmkGTCWnzOwQ.webp" style="width: 100%; height: 100%; object-fit: contain;">`;
                } else {
                    itemContent = `<lottie-player src="https://raw.githubusercontent.com/vovashmyhol/Voco-Stickers/refs/heads/main/Vatman.json" background="transparent" speed="1" style="width: 100%; height: 100%;"></lottie-player>`;
                }

                item.innerHTML = `
                    <div class="inventory-sticker-container">
                        ${itemContent}
                    </div>
                    <div class="inventory-item-name">${isKitten ? 'Kitten Pack' : 'Vatman family'}</div>
                `;
            }

            item.addEventListener('click', () => {
                if (isMinted) {
                    openPackModal(packId, 'profile', itemData);
                } else {
                    openPackModal(packId, 'profile');
                }
            });

            grid.appendChild(item);
        });
    }
}

// 4. Modal Close
document.getElementById('closeModal').addEventListener('click', () => {
    closeModal();
});

// 4. Modal Slider Logic
function updateSmartDots(activeIndex) {
    const modalDots = document.querySelectorAll('.m-dot');
    modalDots.forEach((dot, index) => {
        const distance = Math.abs(index - activeIndex);
        dot.className = 'm-dot';
        
        if (distance === 0) {
            dot.classList.add('active');
        } else if (distance === 1) {
            dot.classList.add('near'); // Slightly smaller
        } else if (distance === 2) {
            dot.classList.add('mid'); // Small
        } else {
            dot.classList.add('hidden'); // Hide
        }
    });
}

function initModalSlider() {
    const lottieSlider = document.getElementById('lottieSlider');
    if (lottieSlider) {
        lottieSlider.onscroll = () => {
            const scrollPosition = lottieSlider.scrollLeft;
            const slides = lottieSlider.querySelectorAll('.lottie-slide');
            if (slides.length === 0) return;

            const slideWidth = slides[0].offsetWidth;
            const activeIndex = Math.round(scrollPosition / slideWidth);
            updateSmartDots(activeIndex);
        };
    }
}

let currentModalPackId = 'VocoX';

function openPackModal(packId, context = 'market', mintedData = null) {
    const modalEl = document.getElementById('packModal');
    if (!modalEl) {
        console.error('Modal element not found!');
        return;
    }

    currentModalPackId = packId;
    updateModalUI(packId, context, mintedData);

    const modalContent = modalEl.querySelector('.modal-content');
    modalContent.classList.remove('dragging');
    modalContent.style.transform = ''; 

    if (mintedData) {
        modalContent.classList.add('is-minted');
    } else {
        modalContent.classList.remove('is-minted');
    }

    // Impact feedback first
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }

    // Show the modal
    modalEl.classList.add('active');
    document.body.classList.add('modal-active');

    updateBackButton();
}

function closeModal() {
    const modalEl = document.getElementById('packModal');
    if (!modalEl) return;

    modalEl.classList.remove('active');
    document.body.classList.remove('modal-active');

    updateBackButton();
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

/**
 * Initialize Gesture-based closing (Swipe Down)
 */
function initModalGestures() {
    // Gestures disabled — modal is full-screen, close via Telegram Back button
}

function updateModalUI(packId, context = 'market', mintedData = null) {
    const marketInfo = document.getElementById('marketInfo');
    const ownerRow = document.getElementById('ownerRow');
    const buyBtn = document.getElementById('buyBtn');
    const priceValue = document.getElementById('priceValue');
    const supplyValue = document.getElementById('supplyValue');
    const extraActions = document.getElementById('extraActions');
    const packTitle = document.querySelector('.pack-title-bold');
    const slider = document.getElementById('lottieSlider');
    const modalDotsContainer = document.getElementById('modalDots');

    // Properties mapping for background names (15 Total)
    const backgroundNames = {
        'grad-1': 'Deep Space',
        'grad-2': 'Sunset Mist',
        'grad-3': 'Electric Cyan',
        'grad-4': 'Jungle Glow',
        'grad-5': 'Sky Dream',
        'grad-6': 'Royal Purple',
        'grad-7': 'Sunset Flare',
        'grad-8': 'Toxic Mint',
        'grad-9': 'Crimson Flare',
        'grad-10': 'Vivid Orchid',
        'grad-11': 'Solar Flare',
        'grad-12': 'Phantom Indigo',
        'grad-13': 'Nordic Night',
        'grad-14': 'Midnight Onyx', // Legendary
        'grad-15': 'Abyssal Abyss'   // Legendary
    };

    const rarityNames = {
        'grad-1': 'Common', 'grad-2': 'Common', 'grad-3': 'Common', 'grad-4': 'Common', 'grad-5': 'Common', 'grad-6': 'Common', 'grad-7': 'Common',
        'grad-8': 'Rare', 'grad-9': 'Rare', 'grad-10': 'Rare', 'grad-11': 'Rare',
        'grad-12': 'Epic', 'grad-13': 'Epic',
        'grad-14': 'Legendary', 'grad-15': 'Legendary'
    };

    const rarityClasses = {
        'Common': 'rarity-common',
        'Rare': 'rarity-rare',
        'Epic': 'rarity-epic',
        'Legendary': 'rarity-legendary'
    };

    const bgOverlay = document.getElementById('modalBgOverlay');

    console.log('Updating Modal UI for:', packId, 'Context:', context, 'Minted:', !!mintedData);

    // Apply Minted Background if available
    if (bgOverlay) {
        if (mintedData) {
            bgOverlay.className = `modal-bg-overlay active ${mintedData.mintData.gradientClass}`;
        } else {
            bgOverlay.className = 'modal-bg-overlay';
        }
    }

    // Configuration based on packId
    let price = '15';
    let supply = '333 of 333';
    let title = 'Vatman family';
    let slides = [
        'https://raw.githubusercontent.com/vovashmyhol/Voco-Stickers/refs/heads/main/Vatman.json',
        'https://raw.githubusercontent.com/vovashmyhol/Voco-Stickers/refs/heads/main/Choco.json',
        'https://raw.githubusercontent.com/vovashmyhol/Voco-Stickers/refs/heads/main/Pink.json',
        'https://raw.githubusercontent.com/vovashmyhol/Voco-Stickers/refs/heads/main/Sad.json',
        'https://raw.githubusercontent.com/vovashmyhol/Voco-Stickers/refs/heads/main/Vatman.json',
        'https://raw.githubusercontent.com/vovashmyhol/Voco-Stickers/refs/heads/main/Vatman.json'
    ];
    let isLottie = true;

    if (packId === 'Kitten') {
        price = '7';
        supply = '99 of 99';
        title = 'Kitten Pack';
        slides = [
            'Kitten/CAACAgIAAxUAAWn8ngkaS9tMy3lKuzIr40hAyubNAAK8iQAChGexS4oMmkGTCWnzOwQ.webp',
            'Kitten/CAACAgIAAxUAAWn8ngl0Uic8CPFn8PaNlxJiYMvfAALhjgACFSupS0M1XTEi-JfEOwQ.webp',
            'Kitten/CAACAgIAAxUAAWn8ngl7r-dZimllMsYM5Df_KmpYAALLhAACsX2oS9hrui4DeKoNOwQ.webp',
            'Kitten/CAACAgIAAxUAAWn8nglKGrtEu5_12GtTsCPlsE-CAAIqgAAC4SKwS3OD04mbQpy0OwQ.webp',
            'Kitten/CAACAgIAAxUAAWn8nglViygopzBLGP1ncUGJbqJxAAIimQACsBSpSzY51wAB1Vte7TsE.webp',
            'Kitten/CAACAgIAAxUAAWn8nglXfpjgdGBxk9cUmN-rdVlhAAL1rQACrKSpS1G2Zy6MJRKwOwQ.webp',
            'Kitten/CAACAgIAAxUAAWn8nglzg7EjC8t-OkDraKsuOsoJAAIEhAAC3p-wS8qBNPSHzJv5OwQ.webp',
            'Kitten/CAACAgIAAxUAAWn8ngm6t03GV5JHzRdbUN6fm0wRAALBngAC-A6pSxZ1haB1v15xOwQ.webp',
            'Kitten/CAACAgIAAxUAAWn8ngmeBwl1_yp9c9_WHlTa-XQwAAIhigAC6uqoS7oCGkyd2tf_OwQ.webp',
            'Kitten/CAACAgIAAxUAAWn8ngmgIgbykSXGFyC6BK35sNeEAAJbiQACksqpSzFIjsCS_wWBOwQ.webp',
            'Kitten/CAACAgIAAxUAAWn8ngmqZf5AJbl1S2LGjO1HRj3KAAJxmAACbbGpS5m7ONJOa_KyOwQ.webp',
            'Kitten/CAACAgIAAxUAAWn8ngmwZ32WyYWJc7pXbOq49SO8AAJhkgACRDapS1J3lQ223rAVOwQ.webp',
            'Kitten/CAACAgIAAxUAAWn8ngnBNZgjgtUo8knekJleUs9gAAL9nwACqsmpS3jKuSTGAyHXOwQ.webp',
            'Kitten/CAACAgIAAxUAAWn8ngnDhAABwrWBfzC2N3SFbJEq7QACbZgAAor0qEtsXHpThj8f6zsE.webp',
            'Kitten/CAACAgIAAxUAAWn8ngnU2O29CDm74uvXtPqCnCOaAALlgwACZBaoS_IaSnR-SYJoOwQ.webp',
            'Kitten/CAACAgIAAxkBAAEDuTZp_J393n7Qp-lKIQxVL_rGa2RqDQACsJIAAiG5qEtR64MguW7vITsE.webp'
        ];
        isLottie = false;
    }

    if (priceValue) priceValue.textContent = price;
    if (supplyValue) supplyValue.textContent = supply;
    
    // Set Title & Author
    if (mintedData) {
        if (packTitle) {
            const author = packId === 'Kitten' ? '@vovnx' : '@voco_in';
            const authorLink = packId === 'Kitten' ? 'https://t.me/vovnx' : 'https://t.me/voco_in';
            packTitle.innerHTML = `${title} #${mintedData.mintData.serial}<div class="pack-author-sub">by <a href="${authorLink}" target="_blank"><span>${author}</span></a></div>`;
        }
    } else {
        if (packTitle) packTitle.textContent = title;
    }

    // Update Slider Content
    if (slider) {
        slider.innerHTML = '';
        const currentSlides = mintedData ? [mintedData.mintData.src] : slides;
        const currentLottie = mintedData ? mintedData.mintData.isLottie : isLottie;
        
        currentSlides.forEach(src => {
            const slide = document.createElement('div');
            slide.className = 'lottie-slide';
            if (currentLottie) {
                slide.innerHTML = `<lottie-player src="${src}" background="transparent" speed="1" loop autoplay></lottie-player>`;
            } else {
                slide.innerHTML = `<img src="${src}" alt="Pack Sticker">`;
            }
            slider.appendChild(slide);
        });
        slider.scrollLeft = 0;
    }

    // Update Pagination Dots
    if (modalDotsContainer) {
        modalDotsContainer.innerHTML = '';
        const dotCount = mintedData ? 1 : slides.length;
        for(let i=0; i<dotCount; i++) {
            const dot = document.createElement('span');
            dot.className = i === 0 ? 'm-dot active' : 'm-dot';
            modalDotsContainer.appendChild(dot);
        }
        updateSmartDots(0);
    }

    // Handle Properties Section for Minted items
    let propertiesEl = document.getElementById('mintProperties');
    if (!propertiesEl && mintedData) {
        propertiesEl = document.createElement('div');
        propertiesEl.id = 'mintProperties';
        propertiesEl.className = 'info-card mint-props-card';
        marketInfo.parentNode.insertBefore(propertiesEl, marketInfo.nextSibling);
    }
    
    if (propertiesEl) {
        if (mintedData) {
            const m = mintedData.mintData;
            const rarity = rarityNames[m.gradientClass] || 'Common';
            propertiesEl.style.display = 'block';
            propertiesEl.innerHTML = `
                <div class="info-row">
                    <span class="info-label">Rarity</span>
                    <span class="info-value ${rarityClasses[rarity]}">${rarity}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Background</span>
                    <span class="info-value highlight-blue">${backgroundNames[m.gradientClass] || 'Standard'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Model</span>
                    <span class="info-value">${title}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Serial</span>
                    <span class="info-value">#${m.serial}</span>
                </div>
            `;
        } else {
            propertiesEl.style.display = 'none';
        }
    }

    if (context === 'profile') {
        if (ownerRow) ownerRow.style.display = 'block';
        buyBtn.textContent = 'Open';
        buyBtn.classList.add('btn-small');
        if (extraActions) extraActions.style.display = 'flex';
        
        // Handle Mint Button Visibility/State (only for non-minted packs)
        const mintBtn = document.getElementById('mintBtn');
        if (mintBtn) {
            if (mintedData) {
                mintBtn.style.display = 'none'; // Hide if already minted
            } else {
                mintBtn.style.display = 'flex';
                const hasRegularPack = inventory.some(item => (item.id === packId && !item.mintData));
                if (hasRegularPack) {
                    mintBtn.style.opacity = '1';
                    mintBtn.style.filter = 'none';
                    mintBtn.style.pointerEvents = 'auto';
                } else {
                    mintBtn.style.opacity = '0.5';
                    mintBtn.style.filter = 'grayscale(1)';
                    mintBtn.style.pointerEvents = 'none';
                }
            }
        }
    } else {
        if (ownerRow) ownerRow.style.display = 'none';
        buyBtn.textContent = 'Get';
        buyBtn.classList.remove('btn-small');
        if (extraActions) extraActions.style.display = 'none';
        if (propertiesEl) propertiesEl.style.display = 'none';
    }
}

// 5. Purchase Logic
document.getElementById('buyBtn').addEventListener('click', () => {
    // If we are in profile view, 'buyBtn' acts as 'Open'
    const isProfileActive = document.getElementById('profileView').classList.contains('active');

    if (isProfileActive) {
        // Open the sticker set or profile
        const link = currentModalPackId === 'Kitten' ? 'https://t.me/vovnx' : 'https://t.me/addstickers/VocoX';
        tg.openTelegramLink(link);
    } else {
        // Market Mode: Purchase flow
        const invoiceUrl = 'https://t.me/$j4ADo8xWMEtDFgAAl_xEVL2lLAU';

        if (tg.initData && tg.openInvoice) {
            tg.openInvoice(invoiceUrl, (status) => {
                if (status === 'paid' || status === 'pending') {
                    confirmPurchase(currentModalPackId);
                }
            });
        } else {
            // Browser Mode: Grant for free
            confirmPurchase(currentModalPackId);
        }
    }
});

async function confirmPurchase(packId) {
    // Generate a unique instance ID for this acquisition
    const instanceId = `${packId}_${Date.now()}`;
    inventory.push({
        id: packId,
        instanceId: instanceId,
        purchasedAt: new Date().toISOString()
    });

    // Save to CloudStorage
    await storage.set(INVENTORY_KEY, JSON.stringify(inventory));

    tg.HapticFeedback.notificationOccurred('success');
    showSuccessModal(packId);

    // Check for Crown Reward (exactly 5 packs)
    if (inventory.length === 5) {
        setTimeout(() => {
            showRewardModal();
        }, 1500); // Small delay after success modal shows
    }
}

// Global intervals for continuous stars
let continuousStarsInterval = null;
let rewardStarsInterval = null;

function showSuccessModal(packId) {
    const successModal = document.getElementById('successModal');
    const container = document.getElementById('successLottieContainer');
    const okBtn = document.getElementById('successOkBtn');

    if (!successModal || !container || !okBtn) return;

    // Smooth Activation
    successModal.classList.remove('fade-out');
    successModal.classList.add('active');
    successModal.style.display = 'flex';

    // Trigger Star Explosion (Initial Burst)
    createStarExplosion(60);
    // Start continuous flow
    startContinuousStars();

    // Inject Content
    container.innerHTML = '';
    if (packId === 'Kitten') {
        const img = document.createElement('img');
        img.src = 'Kitten/CAACAgIAAxUAAWn8ngkaS9tMy3lKuzIr40hAyubNAAK8iQAChGexS4oMmkGTCWnzOwQ.webp';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        container.appendChild(img);
    } else {
        const player = document.createElement('lottie-player');
        player.setAttribute('src', 'https://raw.githubusercontent.com/vovashmyhol/Voco-Stickers/refs/heads/main/Vatman.json');
        player.setAttribute('background', 'transparent');
        player.setAttribute('speed', '1');
        player.setAttribute('autoplay', '');
        player.style.width = '100%';
        player.style.height = '100%';
        container.appendChild(player);
    }

    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

    // Smooth Closing
    okBtn.onclick = (e) => {
        if (e) e.preventDefault();
        successModal.classList.add('fade-out');

        setTimeout(() => {
            stopContinuousStars();
            successModal.classList.remove('active', 'fade-out');
            successModal.style.display = 'none';
            document.body.classList.remove('modal-active');
            if (typeof closeModal === 'function') closeModal();
            if (typeof renderInventory === 'function') renderInventory();
        }, 500);

        okBtn.onclick = null;
    };
}
function createStarExplosion(count = 40, isContinuous = false, targetId = 'starExplosion') {
    const container = document.getElementById(targetId);
    if (!container) return;

    if (!isContinuous) container.innerHTML = '';
    const particleCount = count;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'star-particle';

        // Random direction and distance
        const angle = Math.random() * Math.PI * 2;
        const distance = isContinuous ? (150 + Math.random() * 150) : (100 + Math.random() * 200);
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;

        // Custom properties for CSS animation
        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);

        // Random size variation
        const size = 1 + Math.random() * (isContinuous ? 1 : 2);
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;

        // Random delay and duration
        const delay = isContinuous ? 0 : (Math.random() * 0.3);
        const duration = isContinuous ? (2.0 + Math.random() * 2.0) : (0.8 + Math.random() * 1.2);

        particle.style.animation = `starEmanate ${duration}s cubic-bezier(0.1, 0.4, 0.2, 1) ${delay}s forwards`;

        container.appendChild(particle);

        // Cleanup particle after animation
        setTimeout(() => {
            if (particle.parentNode === container) {
                container.removeChild(particle);
            }
        }, (duration + delay) * 1000);
    }
}

function startContinuousStars() {
    if (continuousStarsInterval) clearInterval(continuousStarsInterval);
    continuousStarsInterval = setInterval(() => {
        createStarExplosion(3, true); // Add 3 stars periodically
    }, 200);
}

function stopContinuousStars() {
    if (continuousStarsInterval) {
        clearInterval(continuousStarsInterval);
        continuousStarsInterval = null;
    }
}

function showRewardModal() {
    const rewardModal = document.getElementById('rewardModal');
    const okBtn = document.getElementById('rewardOkBtn');
    if (!rewardModal || !okBtn) return;

    rewardModal.style.display = 'flex';
    setTimeout(() => {
        rewardModal.classList.add('active');
        // Initial burst
        createStarExplosion(50, false, 'rewardExplosion');
        // Continuous flow
        startContinuousRewardStars();
    }, 10);

    tg.HapticFeedback.notificationOccurred('success');

    const handleClose = () => {
        rewardModal.classList.remove('active');
        stopContinuousRewardStars();
        setTimeout(() => {
            rewardModal.style.display = 'none';
            // Reset transforms
            const content = rewardModal.querySelector('.reward-content');
            if (content) content.style.transform = '';
            rewardModal.style.background = '';
        }, 500);
    };

    okBtn.onclick = handleClose;
    rewardModal.dataset.closeHandler = 'true'; // Mark that we have logic to reset
}

function initRewardModalGestures() {
    const modal = document.getElementById('rewardModal');
    const content = modal.querySelector('.reward-content');
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let dragDelta = 0;

    content.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        isDragging = true;
    }, { passive: true });

    content.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        dragDelta = currentY - startY;

        if (dragDelta > 0) {
            content.style.transition = 'none';
            content.style.transform = `translateY(${dragDelta}px)`;

            // Dim overlay
            const opacity = 1 - Math.min(dragDelta / 400, 0.5);
            modal.style.background = `rgba(0, 0, 0, ${0.7 * opacity})`;

            if (e.cancelable) e.preventDefault();
        }
    }, { passive: false });

    const handleRelease = () => {
        if (!isDragging) return;
        isDragging = false;

        content.style.transition = 'transform 0.4s cubic-bezier(0.1, 0.9, 0.2, 1)';

        if (dragDelta > 100) {
            // Close
            const okBtn = document.getElementById('rewardOkBtn');
            if (okBtn) okBtn.click();
        } else {
            // Snap back
            content.style.transform = 'translateY(0)';
            modal.style.background = '';
        }

        dragDelta = 0;
    };

    content.addEventListener('touchend', handleRelease);
    content.addEventListener('touchcancel', handleRelease);
}


function startContinuousRewardStars() {
    if (rewardStarsInterval) clearInterval(rewardStarsInterval);
    rewardStarsInterval = setInterval(() => {
        createStarExplosion(3, true, 'rewardExplosion');
    }, 200);
}

function stopContinuousRewardStars() {
    if (rewardStarsInterval) {
        clearInterval(rewardStarsInterval);
        rewardStarsInterval = null;
    }
}

function initMinting() {
    const mintBtn = document.getElementById('mintBtn');
    const resultCloseBtn = document.getElementById('mintResultCloseBtn');
    
    // Confirmation Modal Elements
    const confirmModal = document.getElementById('mintConfirmModal');
    const confirmStartBtn = document.getElementById('confirmMintStart');
    const cancelMintBtn = document.getElementById('cancelMint');
    const closeConfirmBtn = document.getElementById('closeMintConfirm');

    if (mintBtn) {
        mintBtn.onclick = () => {
            tg.HapticFeedback.impactOccurred('medium');
            if (confirmModal) {
                const packName = currentModalPackId === 'Kitten' ? 'Kitten Pack' : 'Vatman family';
                
                // Update Modal Text
                const title = confirmModal.querySelector('.mint-confirm-title');
                const text = confirmModal.querySelector('.mint-confirm-text');
                if (title) title.textContent = `Craft ${packName}`;
                if (text) text.innerHTML = `This action will consume your <b>${packName}</b> to create <b>one unique sticker</b> with a random rarity, background, and serial number.`;

                populateMintShowcase(currentModalPackId);
                startButtonStars(); 
                startPreviewSlideshow(currentModalPackId);
                confirmModal.style.display = 'flex';
                setTimeout(() => confirmModal.classList.add('active'), 10);
            }
        };
    }

    let btnStarsInterval = null;
    function startButtonStars() {
        if (btnStarsInterval) clearInterval(btnStarsInterval);
        btnStarsInterval = setInterval(() => {
            createStarExplosion(2, true, 'btnStarsContainer');
        }, 150);
    }

    let slideshowInterval = null;
    function startPreviewSlideshow(packId) {
        const stickers = packId === 'Kitten' ? allKittenStickers : allVocoStickers;
        const card = document.querySelector('.mint-preview-card');
        const container = card ? card.querySelector('.preview-sticker') : null;
        const badge = card ? card.querySelector('.preview-badge') : null;
        if (!card || !container) return;

        let index = 0;
        const rarities = ['Common #321', 'Rare #088', 'Epic #007', 'Legendary #001'];
        
        // Initial set (immediately)
        const setContent = (idx) => {
            const src = stickers[idx];
            const isLottie = src.endsWith('.json');
            container.innerHTML = isLottie ? 
                `<lottie-player src="${src}" background="transparent" speed="1" loop autoplay></lottie-player>` :
                `<img src="${src}" style="width: 100%; height: 100%; object-fit: contain;">`;
            
            const gradNum = Math.floor(Math.random() * 15) + 1;
            card.className = `mint-preview-card grad-${gradNum}`;
            if (badge) {
                const rIdx = Math.floor(Math.random() * rarities.length);
                const serial = Math.floor(100 + Math.random() * 899);
                const rarityText = rarities[rIdx].split(' #')[0];
                badge.textContent = `${rarityText} #${serial}`;
            }
        };

        setContent(0); // Set first item immediately

        if (slideshowInterval) clearInterval(slideshowInterval);
        slideshowInterval = setInterval(() => {
            index = (index + 1) % stickers.length;
            
            // Fade out
            container.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            
            setTimeout(() => {
                setContent(index);
                // Fade in
                container.style.opacity = '1';
                card.style.transform = 'scale(1)';
            }, 300);
        }, 2000);
    }

    function stopPreviewSlideshow() {
        if (slideshowInterval) {
            clearInterval(slideshowInterval);
            slideshowInterval = null;
        }
    }

    function stopButtonStars() {
        if (btnStarsInterval) {
            clearInterval(btnStarsInterval);
            btnStarsInterval = null;
        }
    }

    function populateMintShowcase(packId) {
        const showcase = document.getElementById('mintShowcase');
        if (!showcase) return;
        showcase.innerHTML = '';

        const slides = packId === 'Kitten' ? allKittenStickers : allVocoStickers;

        // Symmetrical positions (Top Left, Top Right, Bottom Left, Bottom Right)
        const positions = [
            { top: '15%', left: '10%' },
            { top: '15%', right: '10%' },
            { bottom: '25%', left: '10%' },
            { bottom: '25%', right: '10%' }
        ];

        positions.forEach((pos, i) => {
            const asset = document.createElement('div');
            asset.className = 'floating-asset';
            
            // Apply position
            Object.keys(pos).forEach(key => asset.style[key] = pos[key]);
            
            const src = slides[i % slides.length];
            const isLottie = src.endsWith('.json');
            asset.innerHTML = isLottie ? 
                `<lottie-player src="${src}" background="transparent" speed="1" loop autoplay></lottie-player>` :
                `<img src="${src}" style="width: 100%; height: 100%; object-fit: contain;">`;
            
            // Randomize animation delay for natural feel
            asset.style.animationDelay = `${i * 0.5}s`;
            
            showcase.appendChild(asset);
        });
    }

    if (confirmStartBtn) {
        confirmStartBtn.onclick = () => {
            if (confirmModal) {
                confirmModal.classList.remove('active');
                stopButtonStars(); // Stop the stars
                setTimeout(() => confirmModal.style.display = 'none', 500);
            }
            tg.HapticFeedback.impactOccurred('heavy');
            handleMint(currentModalPackId);
        };
    }

    if (cancelMintBtn) cancelMintBtn.onclick = () => closeConfirm();
    if (closeConfirmBtn) closeConfirmBtn.onclick = () => closeConfirm();

    function closeConfirm() {
        if (confirmModal) {
            confirmModal.classList.remove('active');
            stopButtonStars(); // Stop the stars
            stopPreviewSlideshow(); // Stop the slideshow
            setTimeout(() => confirmModal.style.display = 'none', 500);
        }
        tg.HapticFeedback.impactOccurred('light');
    }

    if (resultCloseBtn) {
        resultCloseBtn.onclick = () => {
            document.getElementById('mintResultModal').style.display = 'none';
            closeModal();
            renderInventory();
        };
    }
}

async function handleMint(packId) {
    const overlay = document.getElementById('mintingOverlay');
    const swirler = document.getElementById('swirlingStickers');
    if (!overlay || !swirler) return;

    swirler.innerHTML = '';
    
    // Use the actual full slides for the pack
    const allPackSlides = packId === 'Kitten' ? allKittenStickers : allVocoStickers;

    // Create swirling items using ALL stickers from the pack
    for (let i = 0; i < 20; i++) {
        const item = document.createElement('div');
        item.className = 'swirl-item';
        const src = allPackSlides[i % allPackSlides.length];
        const isLottie = src.endsWith('.json');
        
        item.innerHTML = isLottie ? 
            `<lottie-player src="${src}" background="transparent" speed="1"></lottie-player>` :
            `<img src="${src}">`;
            
        swirler.appendChild(item);

        const radius = 60 + Math.random() * 100;
        const startAngle = Math.random() * Math.PI * 2;
        
        item.animate([
            { transform: 'translate(0, 0) scale(0)', opacity: 0 },
            { transform: `translate(${Math.cos(startAngle)*radius}px, ${Math.sin(startAngle)*radius}px) scale(0.8)`, opacity: 0.8, offset: 0.2 },
            { transform: `translate(0, 0) scale(0.2) rotate(1080deg)`, opacity: 0, offset: 1 }
        ], {
            duration: 2500,
            delay: i * 80,
            iterations: Infinity
        });
    }

    overlay.style.display = 'flex';

    setTimeout(async () => {
        const packIndex = inventory.findIndex(item => item.id === packId && !item.mintData);
        if (packIndex === -1) { overlay.style.display = 'none'; return; }

        const randomSticker = allPackSlides[Math.floor(Math.random() * allPackSlides.length)];
        const isRareNumber = Math.random() < 0.1;
        const serial = isRareNumber ? 
            Math.floor(100 + Math.random() * 899).toString() :
            Math.floor(1000 + Math.random() * 8999).toString();
        
        // Rarity-based Gradient Selection (15 Gradients)
        const roll = Math.random() * 100;
        let gradClass = 'grad-1';
        
        if (roll < 3) {
            // Legendary (3%): grad-14 or grad-15
            gradClass = Math.random() < 0.5 ? 'grad-14' : 'grad-15';
        } else if (roll < 10) {
            // Epic (7%): grad-12 to grad-13
            gradClass = `grad-${Math.floor(12 + Math.random() * 2)}`;
        } else if (roll < 30) {
            // Rare (20%): grad-8 to grad-11
            gradClass = `grad-${Math.floor(8 + Math.random() * 4)}`;
        } else {
            // Common (70%): grad-1 to grad-7
            gradClass = `grad-${Math.floor(1 + Math.random() * 7)}`;
        }

        inventory[packIndex] = {
            ...inventory[packIndex],
            mintData: {
                src: randomSticker,
                isLottie: randomSticker.endsWith('.json'),
                serial: serial,
                gradientClass: gradClass,
                mintedAt: new Date().toISOString()
            }
        };

        await storage.set(INVENTORY_KEY, JSON.stringify(inventory));
        overlay.style.display = 'none';
        showMintResult(inventory[packIndex].mintData);
    }, 3500);
}

function showMintResult(data) {
    const resultModal = document.getElementById('mintResultModal');
    const card = document.getElementById('mintedCard');
    const serial = document.getElementById('cardSerialNumber');
    const container = document.getElementById('cardStickerContainer');
    
    if (!resultModal || !card || !serial || !container) return;

    card.className = `minted-card ${data.gradientClass}`;
    serial.textContent = `#${data.serial}`;
    container.innerHTML = data.isLottie ? 
        `<lottie-player src="${data.src}" background="transparent" speed="1" loop autoplay style="width: 100%; height: 100%;"></lottie-player>` :
        `<img src="${data.src}" style="width: 100%; height: 100%; object-fit: contain;">`;

    resultModal.style.display = 'flex';
    tg.HapticFeedback.notificationOccurred('success');
}

/**
 * Gift Code System Logic
 */
function initGiftSystem() {
    const openBtn = document.getElementById('openGiftCode');
    const closeBtn = document.getElementById('closeGiftModal');
    const redeemBtn = document.getElementById('redeemBtn');
    const modal = document.getElementById('giftModal');
    const input = document.getElementById('giftInput');

    if (!openBtn || !modal) return;

    const validCodes = ['44411', '88833', '87823', '11177', '74777', '33222', '59999'];

    openBtn.onclick = () => {
        modal.classList.add('active');
        document.body.classList.add('modal-active');
        input.value = '';
        input.focus();
        tg.HapticFeedback.impactOccurred('light');
    };

    const closeGiftModal = () => {
        modal.classList.remove('active');
        document.body.classList.remove('modal-active');
    };

    closeBtn.onclick = closeGiftModal;

    redeemBtn.onclick = async () => {
        const code = input.value.trim();
        
        if (!code) {
            tg.HapticFeedback.notificationOccurred('error');
            return;
        }

        if (usedCodes.includes(code)) {
            alert('This code has already been used.');
            tg.HapticFeedback.notificationOccurred('error');
            return;
        }

        if (validCodes.includes(code)) {
            // Success!
            usedCodes.push(code);
            await storage.set(USED_CODES_KEY, JSON.stringify(usedCodes));
            
            // Grant Kitten Pack
            const instanceId = `Kitten_Gift_${Date.now()}`;
            inventory.push({
                id: 'Kitten',
                instanceId: instanceId,
                purchasedAt: new Date().toISOString(),
                isGift: true
            });
            await storage.set(INVENTORY_KEY, JSON.stringify(inventory));

            tg.HapticFeedback.notificationOccurred('success');
            closeGiftModal();
            
            // Trigger purchase success effect
            showSuccessModal('Kitten');
            renderInventory();
        } else {
            alert('Invalid gift code.');
            tg.HapticFeedback.notificationOccurred('error');
        }
    };
}




