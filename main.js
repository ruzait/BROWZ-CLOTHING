let products = [];
let currentFilter = 'all';
let currentSearchQuery = '';

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function handleWhatsAppClick(e) {
    e.stopPropagation();
    const btn = e.target.closest('.whatsapp-btn');
    if (!btn) return;
    
    const id = parseInt(btn.dataset.id);
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    const hasGlobalDiscount = CONFIG.GLOBAL_DISCOUNT > 0;
    const effectiveDiscount = hasGlobalDiscount ? CONFIG.GLOBAL_DISCOUNT : (product.discount || 0);
    const displayPrice = hasGlobalDiscount ? product.price * (1 - CONFIG.GLOBAL_DISCOUNT / 100) : product.price;
    const originalPrice = product.oldPrice || product.price;
    const showOldPrice = hasGlobalDiscount ? (originalPrice !== displayPrice) : (product.oldPrice && product.oldPrice !== product.price);
    
    let colorInfo = '';
    if (product.colors && product.colors.length > 0) {
        colorInfo = `\n*Color:* ${product.colors.join(', ')}`;
    }
    
    const message = `*${CONFIG.SHOP_NAME}*\n━━━━━━━━━━━━━━━━━━━━━━\n\n*${escapeHtml(product.name)}*${colorInfo}\n\n*Price:* ${CONFIG.CURRENCY_SYMBOL}${formatPrice(displayPrice)}${showOldPrice ? `\n*Old Price:* ~~${CONFIG.CURRENCY_SYMBOL}${formatPrice(originalPrice)}~~\n*Discount:* -${effectiveDiscount}%` : ''}\n\n*Code:* ${escapeHtml(product.itemCode) || `${CONFIG.PRODUCT_CODE_PREFIX}-${String(product.id).padStart(4, '0')}`}${product.image ? `\n\n*Product Link:*\n${product.image}` : ''}\n\n━━━━━━━━━━━━━━━━━━━━━━\n\nHi! I'm interested in this product. Is it available?`;
    
    const whatsappUrl = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

document.addEventListener('click', handleWhatsAppClick);

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    const phoneRegex = /^[\d\s\-\+\(\)]{7,20}$/;
    return phoneRegex.test(phone);
}

const CONFIG = {
    SHEET_ID: '1yr2_FNh55z2ryLj8j6NuB5E1aA8dk6acSZXgra6Fzms',
    OFFERS_SHEET_GID: '461927744',
    WHATSAPP_NUMBER: '94757034999',
    SHOP_START_YEAR: 2022,
    SHOP_NAME: 'Browz Clothing',
    SHOP_TAGLINE: 'Premium Clothing & Textiles',
    CURRENCY: 'Rs.',
    CURRENCY_SYMBOL: 'Rs. ',
    PRODUCT_CODE_PREFIX: 'BRC',
    EXPERIENCE_SUFFIX: 'Years',
    SHOW_DISCOUNT_PERCENT: true,
    SHOW_BADGE: true,
    SHOW_ADD_TO_CART: false,
    GLOBAL_DISCOUNT: 0,
    CACHE_TTL: 5 * 60 * 1000,
    CACHE_KEY: 'browzclothing_products',
    CACHE_TIME_KEY: 'browzclothing_products_time',
    OFFERS_CACHE_KEY: 'browzclothing_offers',
    OFFERS_CACHE_TIME_KEY: 'browzclothing_offers_time',
    PRICE_COLORS: {
        DEFAULT: '#111111',
        OLD_PRICE: '#888888',
        DISCOUNT_GOLD: '#c9a959',
        DISCOUNT_MEDIUM: '#e67e22',
        DISCOUNT_HIGH: '#e74c3c',
        DISCOUNT_SUPER: '#27ae60'
    },
    DISCOUNT_THRESHOLDS: {
        SUPER: 50,
        HIGH: 30,
        MEDIUM: 15
    }
};

let offers = [];
let currentOfferIndex = 0;
let offerCarouselInterval = null;
let countdownIntervalId = null;
let heroSliderInterval = null;

const CATEGORY_COLORS = {
    men: { bg: '#3498db', text: '#ffffff' },
    women: { bg: '#e91e63', text: '#ffffff' },
    kids: { bg: '#27ae60', text: '#ffffff' },
    fabric: { bg: '#c9a959', text: '#1a1a1a' },
    textiles: { bg: '#c9a959', text: '#1a1a1a' }
};

async function loadOffersFromExcel() {
    const cachedTime = sessionStorage.getItem(CONFIG.OFFERS_CACHE_TIME_KEY);
    const now = Date.now();
    
    if (cachedTime && (now - parseInt(cachedTime)) < CONFIG.CACHE_TTL) {
        const cached = sessionStorage.getItem(CONFIG.OFFERS_CACHE_KEY);
        if (cached) {
            offers = JSON.parse(cached);
            return offers;
        }
    }

    try {
        const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRFEZ0NWHMAIaKg8JQnQEG6gBtqr1aIz0UMpCnCwPY2_m_og_FMDPY_lkre0JSe2BUlfvVgWcKMfXvD/pub?gid=461927744&single=true&output=csv';
        
        const response = await fetch(csvUrl, { cache: 'no-cache' });
        if (!response.ok) throw new Error('Failed to fetch offers');
        
        const csvText = await response.text();
        if (!csvText || csvText.trim() === '') throw new Error('Empty response');
        
        const rows = Papa.parse(csvText, {
            skipEmptyLines: true,
            transformHeader: (header) => header.trim().replace(/^["']|["']$/g, '')
        }).data;
        
        if (rows.length < 2) throw new Error('No data found');
        
        const headers = rows[0].map(h => (h || '').trim().toLowerCase());
        
        offers = rows.slice(1).filter(row => {
            if (!row.length) return false;
            const rowData = {};
            headers.forEach((header, i) => {
                rowData[header] = (row[i] || '').trim();
            });
            
            const isActiveRaw = (rowData['is_active'] || '').toLowerCase();
            const isActive = isActiveRaw === 'yes';
            if (!isActive) return false;
            
            const bgUrl = rowData['background_image'] || '';
            if (!bgUrl || bgUrl.length < 10) return false;
            
            const dateStr = rowData['end_date'] || '';
            let endDate = new Date(dateStr);

            if (isNaN(endDate.getTime())) {
                const parts = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/);
                if (parts) {
                    endDate = new Date(parts[3], parts[1] - 1, parts[2], parts[4], parts[5], parts[6]);
                }
            }

            if (isNaN(endDate.getTime())) return false;
            
            return true;
        }).map((row, index) => {
            const rowData = {};
            headers.forEach((header, i) => {
                rowData[header] = (row[i] || '').trim();
            });
            return {
                id: index + 1,
                backgroundImage: rowData['background_image'] || '',
                badgeText: rowData['badge_text'] || '',
                title: rowData['title'] || '',
                subtitle: rowData['subtitle'] || '',
                endDate: rowData['end_date'] || '',
                isActive: true
            };
        }).sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
        
        sessionStorage.setItem(CONFIG.OFFERS_CACHE_KEY, JSON.stringify(offers));
        sessionStorage.setItem(CONFIG.OFFERS_CACHE_TIME_KEY, now.toString());
        
        return offers;
    } catch (error) {
        console.error('Error loading offers:', error);
        return [];
    }
}

function initOffersCarousel() {
    if (offers.length === 0) {
        const offersSection = document.querySelector('.offers');
        if (offersSection) {
            offersSection.style.display = 'none';
        }
        return;
    }

    const prevBtn = document.querySelector('.carousel-prev');
    const nextBtn = document.querySelector('.carousel-next');
    const dotsContainer = document.getElementById('carouselDots');

    if (offers.length === 1) {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        if (dotsContainer) dotsContainer.style.display = 'none';
    } else {
        if (prevBtn) prevBtn.style.display = 'flex';
        if (nextBtn) nextBtn.style.display = 'flex';
        
        if (dotsContainer) {
            dotsContainer.innerHTML = offers.map((_, i) => 
                `<span class="carousel-dot ${i === 0 ? 'active' : ''}" onclick="showOffer(${i})"></span>`
            ).join('');
            dotsContainer.style.display = 'flex';
        }
    }

    initOffersSwipe();
    renderCurrentOffer();
    startOfferAutoAdvance();
}

function initOffersSwipe() {
    const slidesContainer = document.querySelector('.offers-slides');
    if (!slidesContainer) return;
    
    let touchStartX = 0;
    let touchEndX = 0;
    const minSwipeDistance = 50;
    
    slidesContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    slidesContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        const swipeDistance = touchEndX - touchStartX;
        
        if (swipeDistance > minSwipeDistance) {
            prevOffer();
        } else if (swipeDistance < -minSwipeDistance) {
            nextOffer();
        }
    }
}

function renderCurrentOffer() {
    const offer = offers[currentOfferIndex];
    const container = document.querySelector('.offers-container');
    if (!container || !offer) return;

    const badgeEl = container.querySelector('.offers-badge .badge-text');
    const titleEl = container.querySelector('.offers-title');
    const subtitleEl = container.querySelector('.offers-subtitle');
    const countdownNoteEl = container.querySelector('.countdown-note');
    const bgImg = document.querySelector('.offers-bg img');
    const ctaBtn = container.querySelector('.btn');

    if (badgeEl) badgeEl.textContent = offer.badgeText || '';
    if (titleEl) titleEl.textContent = offer.title || '';
    if (subtitleEl) subtitleEl.innerHTML = offer.subtitle || '';
    if (countdownNoteEl) countdownNoteEl.textContent = 'Limited time offer - Don\'t miss out!';
    if (bgImg) bgImg.src = offer.backgroundImage || '';
    if (ctaBtn) {
        ctaBtn.innerHTML = '<span>Visit Showroom</span><i class="fas fa-store"></i>';
    }

    const dots = document.querySelectorAll('.carousel-dot');
    dots.forEach((dot, i) => dot.classList.toggle('active', i === currentOfferIndex));

    resetOfferTimer();
}

function showOffer(index) {
    if (offers.length === 0 || index < 0 || index >= offers.length) return;
    
    currentOfferIndex = index;
    renderCurrentOffer();
    
    if (offerCarouselInterval) {
        clearInterval(offerCarouselInterval);
    }
    startOfferAutoAdvance();
}

function nextOffer() {
    if (offers.length <= 1) return;
    const nextIndex = (currentOfferIndex + 1) % offers.length;
    showOffer(nextIndex);
}

function prevOffer() {
    if (offers.length <= 1) return;
    const prevIndex = (currentOfferIndex - 1 + offers.length) % offers.length;
    showOffer(prevIndex);
}

function startOfferAutoAdvance() {
    if (offerCarouselInterval) clearInterval(offerCarouselInterval);
    if (offers.length > 1) {
        offerCarouselInterval = setInterval(nextOffer, 8000);
    }
}

function resetOfferTimer() {
    if (countdownIntervalId) {
        clearInterval(countdownIntervalId);
        countdownIntervalId = null;
    }
    
    if (offers.length === 0) return;
    
    const offer = offers[currentOfferIndex];
    const countdownDateObj = new Date(offer.endDate);
    
    if (isNaN(countdownDateObj.getTime())) {
        showOfferEndedMessage();
        return;
    }
    
    let countdownDate = countdownDateObj.getTime();
    
    const daysEl = document.getElementById('offerDays0');
    const hoursEl = document.getElementById('offerHours0');
    const minutesEl = document.getElementById('offerMinutes0');
    const secondsEl = document.getElementById('offerSeconds0');
    
    function update() {
        const now = new Date().getTime();
        const distance = countdownDate - now;
        
        if (distance <= 0) {
            clearInterval(countdownIntervalId);
            countdownIntervalId = null;
            showOfferEndedMessage();
            return;
        }
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
        if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
        if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
        if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
    }
    
    update();
    countdownIntervalId = setInterval(update, 1000);
}

function showOfferEndedMessage() {
    if (offers.length > 1) {
        const nextActiveOffer = offers.find((o, i) => i !== currentOfferIndex && new Date(o.endDate) > new Date());
        if (nextActiveOffer) {
            currentOfferIndex = offers.indexOf(nextActiveOffer);
            renderCurrentOffer();
            return;
        }
    }
    
    const container = document.querySelector('.offers-container');
    if (!container) return;
    
    const countdown = container.querySelector('.countdown');
    if (countdown) countdown.style.display = 'none';
    
    const prevBtn = document.querySelector('.carousel-prev');
    const nextBtn = document.querySelector('.carousel-next');
    const dotsContainer = document.getElementById('carouselDots');
    
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';
    if (dotsContainer) dotsContainer.style.display = 'none';
    
    container.innerHTML = `
        <div class="offer-ended">
            <div class="offer-ended-badge">
                <i class="fas fa-bell"></i>
                <span>All Offers Ended</span>
            </div>
            <h2 class="offer-ended-title">Current Offers Have Ended!</h2>
            <p class="offer-ended-subtitle">
                Stay tuned for new exciting deals.<br>
                Contact us for the latest offers.
            </p>
            <div class="offer-ended-buttons">
                <a href="#contact" class="btn btn-primary">
                    <span>Contact Us</span>
                    <i class="fas fa-envelope"></i>
                </a>
                <a href="collections.html" class="btn btn-outline">
                    <span>View Products</span>
                    <i class="fas fa-arrow-right"></i>
                </a>
            </div>
        </div>
    `;
    
    if (typeof AOS !== 'undefined') AOS.refresh();
}

const NEW_CATEGORY_COLORS = [
    { bg: '#9b59b6', text: '#ffffff' },
    { bg: '#e74c3c', text: '#ffffff' },
    { bg: '#e67e22', text: '#ffffff' },
    { bg: '#1abc9c', text: '#ffffff' },
    { bg: '#607d8b', text: '#ffffff' },
    { bg: '#f39c12', text: '#1a1a1a' },
    { bg: '#3f51b5', text: '#ffffff' },
    { bg: '#00bcd4', text: '#ffffff' },
    { bg: '#795548', text: '#ffffff' },
    { bg: '#8bc34a', text: '#1a1a1a' }
];

let categoryColorIndex = {};

function getBadgeStyle(badgeText, category, productIndex) {
    if (!badgeText) return '';
    
    const badge = badgeText.toLowerCase();
    const keywordColors = {
        'new': { bg: '#27ae60', text: '#ffffff' },
        'hot': { bg: '#e74c3c', text: '#ffffff' },
        'sale': { bg: '#e74c3c', text: '#ffffff' },
        'trend': { bg: '#3498db', text: '#ffffff' },
        'limited': { bg: '#e67e22', text: '#ffffff' },
        'best seller': { bg: '#9b59b6', text: '#ffffff' }
    };
    
    for (const [key, colors] of Object.entries(keywordColors)) {
        if (badge.includes(key)) {
            return 'style="background:' + colors.bg + ';color:' + colors.text + ';"';
        }
    }
    
    let categoryKey = (category || '').toLowerCase();
    if (CATEGORY_COLORS[categoryKey]) {
        const colors = CATEGORY_COLORS[categoryKey];
        return 'style="background:' + colors.bg + ';color:' + colors.text + ';"';
    }
    
    if (!categoryColorIndex[categoryKey]) {
        const count = Object.keys(categoryColorIndex).length;
        categoryColorIndex[categoryKey] = count % NEW_CATEGORY_COLORS.length;
    }
    const colors = NEW_CATEGORY_COLORS[categoryColorIndex[categoryKey]];
    return 'style="background:' + colors.bg + ';color:' + colors.text + ';"';
}

function formatCategoryName(category) {
    return category.charAt(0).toUpperCase() + category.slice(1);
}

function getPriceStyles(discount) {
    const { PRICE_COLORS, DISCOUNT_THRESHOLDS } = CONFIG;
    let badgeBg = PRICE_COLORS.DISCOUNT_GOLD;
    
    if (discount >= DISCOUNT_THRESHOLDS.SUPER) {
        badgeBg = PRICE_COLORS.DISCOUNT_SUPER;
    } else if (discount >= DISCOUNT_THRESHOLDS.HIGH) {
        badgeBg = PRICE_COLORS.DISCOUNT_HIGH;
    } else if (discount >= DISCOUNT_THRESHOLDS.MEDIUM) {
        badgeBg = PRICE_COLORS.DISCOUNT_MEDIUM;
    }
    
    return {
        priceColor: PRICE_COLORS.DEFAULT,
        oldPriceColor: PRICE_COLORS.OLD_PRICE,
        discountBadgeBg: badgeBg
    };
}

function formatPrice(price) {
    if (!price || isNaN(price)) return '0';
    return Math.round(price).toLocaleString();
}

function getPriceRange() {
    if (products.length === 0) return { min: 0, max: 10000 };
    const prices = products.map(p => p.price);
    return {
        min: Math.min(...prices),
        max: Math.max(...prices)
    };
}

let currentPriceRange = null;
let sliderMinValue = 0;
let sliderMaxValue = 0;
let sliderRangeMin = 0;
let sliderRangeMax = 0;

function initDynamicFilters() {
    const categories = [...new Set(products.map(p => p.category))];
    const filterContainer = document.querySelector('.products-filter');
    
    let html = `<button class="filter-btn active" data-filter="all">All Items</button>`;
    categories.forEach(cat => {
        html += `<button class="filter-btn" data-filter="${cat}">${formatCategoryName(cat)}</button>`;
    });
    filterContainer.innerHTML = html;
    
    initPriceSlider();
    initFilters();
}

function initPriceSlider() {
    const { min, max } = getPriceRange();
    sliderRangeMin = Math.floor(min);
    sliderRangeMax = Math.ceil(max);
    sliderMinValue = sliderRangeMin;
    sliderMaxValue = sliderRangeMax;
    
    const sliderContainer = document.querySelector('.price-slider-container');
    if (!sliderContainer) return;
    
    sliderContainer.innerHTML = `
        <div class="price-slider-header">
            <span class="price-slider-label">Price Range</span>
            <span class="price-slider-values">Rs.${formatPrice(sliderMinValue)} - Rs.${formatPrice(sliderMaxValue)}</span>
        </div>
        <div class="price-slider-track">
            <div class="slider-track"></div>
            <div class="slider-range"></div>
            <div class="slider-thumb thumb-min" data-type="min">
                <span class="thumb-value">Rs.${formatPrice(sliderMinValue)}</span>
            </div>
            <div class="slider-thumb thumb-max" data-type="max">
                <span class="thumb-value">Rs.${formatPrice(sliderMaxValue)}</span>
            </div>
        </div>
    `;
    
    setupSliderListeners();
}

function setupSliderListeners() {
    const sliderRange = document.querySelector('.slider-range');
    const thumbMin = document.querySelector('.thumb-min');
    const thumbMax = document.querySelector('.thumb-max');
    const priceValues = document.querySelector('.price-slider-values');
    const sliderTrack = document.querySelector('.price-slider-track');
    
    if (!sliderRange || !thumbMin || !thumbMax) return;
    
    function getPercent(value) {
        return ((value - sliderRangeMin) / (sliderRangeMax - sliderRangeMin)) * 100;
    }
    
    function updateSlider() {
        let minVal = sliderMinValue;
        let maxVal = sliderMaxValue;
        
        const minPercent = getPercent(minVal);
        const maxPercent = getPercent(maxVal);
        const rangePercent = maxPercent - minPercent;
        
        sliderRange.style.left = `${minPercent}%`;
        sliderRange.style.width = `${rangePercent}%`;
        
        thumbMin.style.left = `${minPercent}%`;
        thumbMax.style.left = `${maxPercent}%`;
        
        const thumbMinValueEl = thumbMin.querySelector('.thumb-value');
        const thumbMaxValueEl = thumbMax.querySelector('.thumb-value');
        if (thumbMinValueEl) thumbMinValueEl.textContent = `Rs.${formatPrice(minVal)}`;
        if (thumbMaxValueEl) thumbMaxValueEl.textContent = `Rs.${formatPrice(maxVal)}`;
        
        if (priceValues) {
            priceValues.textContent = `Rs.${formatPrice(minVal)} - Rs.${formatPrice(maxVal)}`;
        }
    }
    
    function handleThumbDrag(e) {
        e.preventDefault();
        const thumb = e.currentTarget;
        const type = thumb.dataset.type;
        const otherThumb = type === 'min' ? thumbMax : thumbMin;
        
        thumb.classList.add('active');
        
        function onMove(moveEvent) {
            const rect = sliderTrack.getBoundingClientRect();
            const clientX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
            let percent = (clientX - rect.left) / rect.width;
            percent = Math.max(0, Math.min(100, percent));
            
            let value = Math.round(sliderRangeMin + (percent * (sliderRangeMax - sliderRangeMin)));
            
            if (type === 'min') {
                if (value >= sliderMaxValue - 100) {
                    value = sliderMaxValue - 100;
                }
                sliderMinValue = Math.max(sliderRangeMin, value);
            } else {
                if (value <= sliderMinValue + 100) {
                    value = sliderMinValue + 100;
                }
                sliderMaxValue = Math.min(sliderRangeMax, value);
            }
            
            updateSlider();
        }
        
        function onEnd() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
            
            thumb.classList.remove('active');
            
            currentPriceRange = { min: sliderMinValue, max: sliderMaxValue };
            renderProducts(currentFilter);
        }
        
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    }
    
    thumbMin.addEventListener('mousedown', handleThumbDrag);
    thumbMin.addEventListener('touchstart', handleThumbDrag, { passive: false });
    thumbMax.addEventListener('mousedown', handleThumbDrag);
    thumbMax.addEventListener('touchstart', handleThumbDrag, { passive: false });
    
    updateSlider();
}

function getProductImageHTML(product, badgeHTML, escapeFn = escapeHtml) {
    const placeholder = 'images/placeholder.svg';
    const frontImage = product.image || '';
    const backImage = product.backImage || '';
    
    const hasFlip = frontImage && backImage && frontImage !== backImage;
    
    if (hasFlip) {
        return `
            <div class="product-image">
                <div class="product-badges">${badgeHTML}</div>
                <div class="image-flip">
                    <img src="${frontImage}" alt="${escapeFn(product.name)}" class="image-front" loading="lazy">
                    <img src="${backImage}" alt="${escapeFn(product.name)} back" class="image-back" loading="lazy">
                </div>
            </div>`;
    } else {
        return `
            <div class="product-image">
                <div class="product-badges">${badgeHTML}</div>
                <img src="${frontImage || placeholder}" alt="${escapeFn(product.name)}" class="product-image-single" loading="lazy" onerror="this.src='${placeholder}'">
            </div>`;
    }
}

function convertGoogleDriveLink(url) {
    if (!url || !url.includes('drive.google.com')) {
        return url;
    }
    const fileId = url.match(/open\?id=([a-zA-Z0-9_-]+)/)?.[1] || url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
    if (fileId) {
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
    }
    return url;
}

function isValidUrl(string) {
    if (!string) return false;
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

function getCachedProducts() {
    try {
        const cached = localStorage.getItem(CONFIG.CACHE_KEY);
        const cacheTime = localStorage.getItem(CONFIG.CACHE_TIME_KEY);
        
        if (cached && cacheTime) {
            const now = Date.now();
            const age = now - parseInt(cacheTime);
            
            if (age < CONFIG.CACHE_TTL) {
                console.log('Using cached products (age: ' + Math.round(age/1000) + 's)');
                return JSON.parse(cached);
            }
        }
    } catch (e) {
        console.warn('Cache read failed:', e);
    }
    return null;
}

function setCachedProducts(productsData) {
    try {
        localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(productsData));
        localStorage.setItem(CONFIG.CACHE_TIME_KEY, Date.now().toString());
        console.log('Products cached successfully');
    } catch (e) {
        console.warn('Cache write failed:', e);
    }
}

function clearProductsCache() {
    try {
        localStorage.removeItem(CONFIG.CACHE_KEY);
        localStorage.removeItem(CONFIG.CACHE_TIME_KEY);
        console.log('Cache cleared');
    } catch (e) {
        console.warn('Cache clear failed:', e);
    }
}

function validateProduct(item, index) {
    const errors = [];
    
    if (!item['Product Name'] && !item.Name && !item.name) {
        errors.push('Missing product name');
    }
    
    const price = parseFloat(item.Price || item.price || 0);
    if (!price || price <= 0) {
        errors.push('Invalid or missing price');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

async function loadProductsFromExcel() {
    // Always fetch fresh data (remove cache check for now)
    const cachedProducts = null;
    
    console.log('Fetching products from Google Sheet...');
    console.log('Sheet ID:', CONFIG.SHEET_ID);
    
    try {
        const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRFEZ0NWHMAIaKg8JQnQEG6gBtqr1aIz0UMpCnCwPY2_m_og_FMDPY_lkre0JSe2BUlfvVgWcKMfXvD/pub?gid=685618677&single=true&output=csv';
        
        console.log('Fetching:', csvUrl);
        
        const response = await fetch(csvUrl, {
            cache: 'no-cache'
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.status);
        }
        
        const csvText = await response.text();
        console.log('Raw CSV length:', csvText.length);
        console.log('First 500 chars:', csvText.substring(0, 500));
        
        if (!csvText || csvText.trim() === '') {
            throw new Error('Empty response from sheet');
        }
        
        const rows = Papa.parse(csvText, {
            skipEmptyLines: true,
            transformHeader: (header) => header.trim().replace(/^["']|["']$/g, '')
        }).data;
        
        console.log('Parsed rows:', rows.length);
        
        if (rows.length < 2) throw new Error('No data found in sheet');
        
        const headers = rows[0].map(h => (h || '').trim());
        console.log('Headers:', headers);
        
        const rawProducts = rows.slice(1).filter(row => row.length > 1 && row[0]);
        
        const validatedProducts = [];
        
        rawProducts.forEach((row, index) => {
            const item = {};
            headers.forEach((header, i) => {
                item[header] = (row[i] || '').trim();
            });
            
            const validation = validateProduct(item, index);
            if (!validation.isValid) {
                console.warn(`Product ${index + 1} skipped:`, validation.errors.join(', '));
                return;
            }
            
            const price = parseFloat(item.Price || item.price || 0);
            const oldPrice = parseFloat(item['Old Price'] || item.OldPrice || item.oldPrice || 0) || null;
            const sheetDiscount = parseFloat(item['Discount %'] || item.Discount || item.discount || 0);
            const calculatedDiscount = oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;
            
            let finalDiscount = oldPrice ? calculatedDiscount : (sheetDiscount > 0 ? sheetDiscount : 0);
            if (oldPrice && sheetDiscount > 0 && calculatedDiscount !== sheetDiscount) {
                const productName = item['Product Name'] || item.Name || item.Product || 'Unknown';
                console.warn(`Product '${productName}': Discount in sheet (${sheetDiscount}%) doesn't match calculation based on ${CONFIG.CURRENCY}${formatPrice(price)} vs ${CONFIG.CURRENCY}${formatPrice(oldPrice)}. Updated to ${calculatedDiscount}%.`);
            }
            
            const imageUrl = item['Front Image'] || item.Image || item.image || item['Image URL'];
            const backImageUrl = item['Back Image'] || item.BackImage || item.backImage || item.Image || item.image;
            
            const colorsRaw = item['Colors'] || item['colors'] || item['Color'] || item['color'] || item['COLORS'] || '';
            const colors = colorsRaw ? String(colorsRaw).split(',').map(c => c.trim()).filter(c => c) : [];
            
            validatedProducts.push({
                id: index + 1,
                originalIndex: index,
                name: item['Product Name'] || item.Name || item.name || item.Product || '',
                category: (item.Category || item.category || 'general').toLowerCase(),
                price: price,
                oldPrice: oldPrice,
                discount: finalDiscount,
                image: isValidUrl(imageUrl) ? convertGoogleDriveLink(imageUrl) : '',
                backImage: isValidUrl(backImageUrl) ? convertGoogleDriveLink(backImageUrl) : (isValidUrl(imageUrl) ? convertGoogleDriveLink(imageUrl) : ''),
                badge: item.Badge || item.badge || '',
                description: item.Description || item.description || '',
                brand: item.Brand || item.brand || '',
                itemCode: item['Item Code'] || item.ItemCode || item.itemCode || item.Code || item.code || '',
                timestamp: item.Timestamp || item.timestamp || '',
                colors: colors
            });
            
            if (colors.length > 0) {
                console.log(`Product "${item['Product Name'] || item.name}" has colors:`, colors);
            }
        });
        
        console.log('Validated products:', validatedProducts.length);
        products = validatedProducts;
        
        products.sort((a, b) => {
            if (!a.timestamp && !b.timestamp) return b.originalIndex - a.originalIndex;
            if (!a.timestamp) return 1;
            if (!b.timestamp) return -1;
            const dateDiff = new Date(b.timestamp) - new Date(a.timestamp);
            if (dateDiff !== 0) return dateDiff;
            return b.originalIndex - a.originalIndex;
        });
        
        products.forEach((p, i) => p.id = i + 1);
        
        setCachedProducts(products);
        
        console.log('Products loaded from Google Sheets:', products.length);
        return true;
    } catch (error) {
        console.error('Error loading products:', error);
        console.error('Error stack:', error.stack);
        clearProductsCache();
        
        const cachedFallback = getCachedProducts();
        if (cachedFallback) {
            console.log('Using expired cache as fallback');
            products = cachedFallback;
            return true;
        }
        
        products = [];
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    AOS.init({
        duration: 800,
        easing: 'ease-out-cubic',
        once: true,
        offset: 50
    });

    const preloader = document.getElementById('preloader');
    
    await Promise.all([
        loadProductsFromExcel(),
        loadOffersFromExcel()
    ]);
    
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add('loaded');
        }, 1500);
    }

    const productDetail = document.getElementById('productDetail');
    if (productDetail) {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        if (productId) {
            renderProductDetail(productId);
        }
    } else {
        if (products.length > 0) {
            renderHomeProducts();
        } else {
            const grid = document.getElementById('productsGrid');
            if (grid) grid.innerHTML = '<p style="text-align:center;padding:40px;">No products available at the moment.</p>';
        }
    }
    initDynamicContent();

    initNavbar();
    initSearch();
    initHeroSlider();
    initTestimonials();
    initOffersCarousel();
    initForms();
    initBackToTop();
    initScrollReveal();
    initWhatsAppFloat();
});

function initWhatsAppFloat() {
    const whatsappBtn = document.querySelector('.whatsapp-float');
    const hero = document.querySelector('.hero');
    
    if (whatsappBtn && hero) {
        function checkScroll() {
            const heroBottom = hero.offsetTop + hero.offsetHeight;
            const scrollY = window.scrollY;
            
            if (scrollY > heroBottom) {
                whatsappBtn.classList.add('show');
            } else {
                whatsappBtn.classList.remove('show');
            }
        }
        
        window.addEventListener('scroll', checkScroll);
        checkScroll();
    }
}

function initDynamicContent() {
    const currentYear = new Date().getFullYear();
    const yearsExperience = currentYear - CONFIG.SHOP_START_YEAR;
    
    document.querySelectorAll('.exp-number').forEach(el => {
        el.textContent = yearsExperience + '+';
    });

    document.querySelectorAll('.exp-text').forEach(el => {
        el.textContent = CONFIG.EXPERIENCE_SUFFIX;
    });

    document.querySelectorAll('.about-years').forEach(el => {
        el.textContent = yearsExperience;
    });

    document.querySelectorAll('.current-year').forEach(el => {
        el.textContent = currentYear;
    });
}

function initNavbar() {
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    const navOverlay = document.getElementById('navOverlay');

    if (!navbar || !navToggle || !navMenu || !navOverlay) return;

    window.addEventListener('scroll', () => {
        if (!navMenu.classList.contains('active')) {
            if (window.scrollY > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    });

    function closeMenu() {
        navToggle.classList.remove('active');
        navMenu.classList.remove('active');
        navOverlay.classList.remove('active');
        navbar.classList.remove('menu-open');
        document.body.classList.remove('menu-open');
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, parseInt(document.body.dataset.scrollY || '0'));
    }

    function openMenu() {
        navToggle.classList.add('active');
        navMenu.classList.add('active');
        navOverlay.classList.add('active');
        navbar.classList.add('menu-open');
        document.body.classList.add('menu-open');
        document.body.dataset.scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${window.scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
    }

    navToggle.addEventListener('click', () => {
        if (navMenu.classList.contains('active')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    navOverlay.addEventListener('click', closeMenu);

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navMenu.classList.contains('active')) {
            closeMenu();
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024) {
            closeMenu();
        }
    });
}

function initSearch() {
    const searchOverlay = document.getElementById('searchOverlay');
    const searchClose = document.getElementById('searchClose');
    const searchInput = document.getElementById('searchInput');
    const navbarSearchInput = document.getElementById('navbarSearchInput');
    const navbarSearchBtn = document.getElementById('navbarSearchBtn');
    const mobileSearchBtn = document.getElementById('mobileSearchBtn');

    if (!searchOverlay && !navbarSearchInput && !mobileSearchBtn) return;

    function openSearchOverlay() {
        if (searchOverlay) {
            searchOverlay.classList.add('active');
            if (searchInput) setTimeout(() => searchInput.focus(), 100);
        }
    }

    function handleSearchInput(value) {
        currentSearchQuery = value.toLowerCase().trim();
        if (navbarSearchInput) navbarSearchInput.value = value;
        if (searchInput) searchInput.value = value;
        renderProducts(currentFilter);
    }

    if (mobileSearchBtn) {
        mobileSearchBtn.addEventListener('click', openSearchOverlay);
    }

    if (navbarSearchBtn) {
        navbarSearchBtn.addEventListener('click', () => {
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                openSearchOverlay();
            } else {
                navbarSearchInput.focus();
            }
        });
    }

    if (navbarSearchInput) {
        const debouncedSearch = debounce((value) => handleSearchInput(value), 300);
        navbarSearchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });

        navbarSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                navbarSearchInput.blur();
            }
        });
    }

    if (searchClose) {
        searchClose.addEventListener('click', closeSearchOverlay);
    }

    if (searchOverlay) {
        searchOverlay.addEventListener('click', (e) => {
            if (e.target === searchOverlay) {
                closeSearchOverlay();
            }
        });
    }

    if (searchInput) {
        const debouncedSearch = debounce((value) => handleSearchInput(value), 300);
        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                searchInput.blur();
                closeSearchOverlay();
            }
        });
    }
}

function closeSearchOverlay() {
    const searchOverlay = document.getElementById('searchOverlay');
    const searchInput = document.getElementById('searchInput');
    const navbarSearchInput = document.getElementById('navbarSearchInput');
    
    if (searchOverlay) searchOverlay.classList.remove('active');
    if (searchInput) searchInput.value = '';
    if (navbarSearchInput) navbarSearchInput.value = '';
    currentSearchQuery = '';
    renderProducts(currentFilter);
}

function clearAllSearch() {
    const searchInput = document.getElementById('searchInput');
    const navbarSearchInput = document.getElementById('navbarSearchInput');
    const searchOverlay = document.getElementById('searchOverlay');
    
    currentSearchQuery = '';
    
    if (searchInput) searchInput.value = '';
    if (navbarSearchInput) navbarSearchInput.value = '';
    if (searchOverlay) searchOverlay.classList.remove('active');
    
    renderProducts(currentFilter);
}

function renderCollectionsProducts(filter) {
    renderProducts(filter);
}

function renderProducts(filter) {
    currentFilter = filter;
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '';

    let filteredProducts = filter === 'all' 
        ? products 
        : products.filter(p => p.category === filter);

    if (currentSearchQuery.length > 0) {
        filteredProducts = filteredProducts.filter(p => {
            const searchText = [
                p.name,
                p.category,
                p.brand || '',
                p.itemCode || '',
                p.description || ''
            ].join(' ').toLowerCase();
            return searchText.includes(currentSearchQuery);
        });
    }

    if (currentPriceRange) {
        filteredProducts = filteredProducts.filter(p => 
            p.price >= currentPriceRange.min && p.price <= currentPriceRange.max
        );
    }

    if (filteredProducts.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <h3>No products found</h3>
                <p>Try different keywords or clear filters</p>
                <button class="btn-clear-search" onclick="clearFiltersAndSearch()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    Clear Search
                </button>
            </div>
        `;
        return;
    }

    filteredProducts.forEach((product, index) => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('data-category', product.category);

        let badgeHTML = '';
        if (product.badge) {
            const badgeStyle = getBadgeStyle(product.badge, product.category, index);
            badgeHTML = `<span class="badge" ${badgeStyle}>${escapeHtml(product.badge)}</span>`;
        }

        const categoryName = formatCategoryName(product.category);
        const hasGlobalDiscount = CONFIG.GLOBAL_DISCOUNT > 0;
        const effectiveDiscount = hasGlobalDiscount ? CONFIG.GLOBAL_DISCOUNT : (product.discount || 0);
        const displayPrice = hasGlobalDiscount ? product.price * (1 - CONFIG.GLOBAL_DISCOUNT / 100) : product.price;
        const originalPrice = product.oldPrice || product.price;
        const showOldPrice = hasGlobalDiscount ? (originalPrice !== displayPrice) : (product.oldPrice && product.oldPrice !== product.price);
        const priceStyles = getPriceStyles(effectiveDiscount);
        const imageHTML = getProductImageHTML(product, badgeHTML);
        card.innerHTML = `
            <a href="product.html?id=${product.id}" class="product-link-overlay"></a>
            ${imageHTML}
            <div class="product-info">
                <span class="product-category">${escapeHtml(categoryName)}${product.brand ? ` <i class="fas fa-tag brand-tag"></i> <span class="brand-name">${escapeHtml(product.brand)}</span>` : ''}</span>
                <h3 class="product-title"><a href="product.html?id=${product.id}">${escapeHtml(product.name)}</a></h3>
                <div class="product-price-box">
                    <span class="price-current" style="color:${priceStyles.priceColor}">${CONFIG.CURRENCY_SYMBOL}${formatPrice(displayPrice)}</span>
                    ${showOldPrice ? `<span class="price-old" style="color:${priceStyles.oldPriceColor}">${CONFIG.CURRENCY_SYMBOL}${formatPrice(originalPrice)}</span>` : ''}
                    ${effectiveDiscount > 0 ? `<span class="discount-tag" style="background:${priceStyles.discountBadgeBg}">-${effectiveDiscount}%</span>` : ''}
                </div>
                <button class="product-btn whatsapp-btn" data-id="${product.id}">
                    <i class="fab fa-whatsapp"></i>
                    <span>Order via WhatsApp</span>
                </button>
            </div>
        `;

        grid.appendChild(card);
    });
}

function renderHomeProducts() {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '';

    const homeProducts = products.slice(0, 10);

    homeProducts.forEach((product, index) => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('data-category', product.category);

        let badgeHTML = '';
        if (product.badge) {
            const badgeStyle = getBadgeStyle(product.badge, product.category, index);
            badgeHTML = `<span class="badge" ${badgeStyle}>${escapeHtml(product.badge)}</span>`;
        }

        const categoryName = formatCategoryName(product.category);
        const hasGlobalDiscount = CONFIG.GLOBAL_DISCOUNT > 0;
        const effectiveDiscount = hasGlobalDiscount ? CONFIG.GLOBAL_DISCOUNT : (product.discount || 0);
        const displayPrice = hasGlobalDiscount ? product.price * (1 - CONFIG.GLOBAL_DISCOUNT / 100) : product.price;
        const originalPrice = product.oldPrice || product.price;
        const showOldPrice = hasGlobalDiscount ? (originalPrice !== displayPrice) : (product.oldPrice && product.oldPrice !== product.price);
        const priceStyles = getPriceStyles(effectiveDiscount);
        const imageHTML = getProductImageHTML(product, badgeHTML);
        card.innerHTML = `
            <a href="product.html?id=${product.id}" class="product-link-overlay"></a>
            ${imageHTML}
            <div class="product-info">
                <span class="product-category">${escapeHtml(categoryName)}${product.brand ? ` <i class="fas fa-tag brand-tag"></i> <span class="brand-name">${escapeHtml(product.brand)}</span>` : ''}</span>
                <h3 class="product-title"><a href="product.html?id=${product.id}">${escapeHtml(product.name)}</a></h3>
                <div class="product-price-box">
                    <span class="price-current" style="color:${priceStyles.priceColor}">${CONFIG.CURRENCY_SYMBOL}${formatPrice(displayPrice)}</span>
                    ${showOldPrice ? `<span class="price-old" style="color:${priceStyles.oldPriceColor}">${CONFIG.CURRENCY_SYMBOL}${formatPrice(originalPrice)}</span>` : ''}
                    ${effectiveDiscount > 0 ? `<span class="discount-tag" style="background:${priceStyles.discountBadgeBg}">-${effectiveDiscount}%</span>` : ''}
                </div>
                <button class="product-btn whatsapp-btn" data-id="${product.id}">
                    <i class="fab fa-whatsapp"></i>
                    <span>Order via WhatsApp</span>
                </button>
            </div>
        `;

        grid.appendChild(card);
    });
}

function renderProductDetail(productId) {
    const product = products.find(p => p.id === parseInt(productId));
    if (!product) {
        document.getElementById('productDetail').innerHTML = '<div class="product-not-found"><h2>Product not found</h2><a href="index.html" class="btn-back">Back to Home</a></div>';
        return;
    }
    
    const hasGlobalDiscount = CONFIG.GLOBAL_DISCOUNT > 0;
    const effectiveDiscount = hasGlobalDiscount ? CONFIG.GLOBAL_DISCOUNT : (product.discount || 0);
    const displayPrice = hasGlobalDiscount ? product.price * (1 - CONFIG.GLOBAL_DISCOUNT / 100) : product.price;
    const originalPrice = product.oldPrice || product.price;
    const showOldPrice = hasGlobalDiscount ? (originalPrice !== displayPrice) : (product.oldPrice && product.oldPrice !== product.price);
    const priceStyles = getPriceStyles(effectiveDiscount);
    const categoryName = formatCategoryName(product.category);
    const itemCode = product.itemCode || `${CONFIG.PRODUCT_CODE_PREFIX}-${String(product.id).padStart(4, '0')}`;
    
    let images = [];
    if (product.image) images.push({ src: product.image, type: 'front' });
    if (product.backImage && product.backImage !== product.image) images.push({ src: product.backImage, type: 'back' });
    
    let colorSwatches = '';
    if (product.colors && product.colors.length > 0) {
        colorSwatches = `
            <div class="product-colors">
                <div class="color-label">Available Colors:</div>
                <div class="color-swatches">
                    ${product.colors.map(color => `<span class="color-swatch">${escapeHtml(color)}</span>`).join('')}
                </div>
            </div>
        `;
    }
    
    const whatsappMessage = `*${CONFIG.SHOP_NAME}*\n━━━━━━━━━━━━━━━━━━━━━━\n\n*${escapeHtml(product.name)}*\n${product.colors && product.colors.length > 0 ? `\n*Color:* ${product.colors.join(', ')}` : ''}\n\n*Price:* ${CONFIG.CURRENCY_SYMBOL}${formatPrice(displayPrice)}${showOldPrice ? `\n*Old Price:* ~~${CONFIG.CURRENCY_SYMBOL}${formatPrice(originalPrice)}~~\n*Discount:* -${effectiveDiscount}%` : ''}\n\n*Code:* ${escapeHtml(itemCode)}${product.image ? `\n\n*Product Link:*\n${product.image}` : ''}\n\n━━━━━━━━━━━━━━━━━━━━━━\n\nHi! I'm interested in this product. Is it available?`;
    const whatsappUrl = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;
    
    const productDetailHTML = `
        <div class="breadcrumb">
            <a href="index.html">Home</a>
            <span>/</span>
            <a href="collections.html">Collections</a>
            <span>/</span>
            <span>${escapeHtml(product.name)}</span>
        </div>
        
        <div class="product-detail-container">
            <div class="product-gallery">
                <div class="gallery-main">
                    ${images.length > 0 ? `<img src="${images[0].src}" alt="${escapeHtml(product.name)}" id="mainImage">` : '<div class="no-image">No Image Available</div>'}
                </div>
                ${images.length > 1 ? `
                <div class="gallery-nav">
                    <button class="gallery-btn prev" onclick="changeGalleryImage(-1)"><i class="fas fa-chevron-left"></i></button>
                    <div class="gallery-indicators">
                        ${images.map((img, i) => `<span class="indicator ${i === 0 ? 'active' : ''}" onclick="setGalleryImage(${i})"></span>`).join('')}
                    </div>
                    <button class="gallery-btn next" onclick="changeGalleryImage(1)"><i class="fas fa-chevron-right"></i></button>
                </div>
                ` : ''}
            </div>
            
            <div class="product-info-detail">
                ${product.badge ? `<span class="product-badge" style="background:${getBadgeStyle(product.badge, product.category, 0).split('style="')[1]?.replace('background:', '').replace('"', '') || '#666'}">${escapeHtml(product.badge)}</span>` : ''}
                
                <span class="product-category-detail">${escapeHtml(categoryName)}${product.brand ? ` - ${escapeHtml(product.brand)}` : ''}</span>
                <h1 class="product-title-detail">${escapeHtml(product.name)}</h1>
                
                <div class="product-price-detail">
                    <span class="price-current-detail" style="color:${priceStyles.priceColor}">${CONFIG.CURRENCY_SYMBOL}${formatPrice(displayPrice)}</span>
                    ${showOldPrice ? `<span class="price-old-detail" style="color:${priceStyles.oldPriceColor}">${CONFIG.CURRENCY_SYMBOL}${formatPrice(originalPrice)}</span>` : ''}
                    ${effectiveDiscount > 0 ? `<span class="discount-tag-detail" style="background:${priceStyles.discountBadgeBg}">-${effectiveDiscount}% OFF</span>` : ''}
                </div>
                
                <div class="product-code">Code: <strong>${escapeHtml(itemCode)}</strong></div>
                
                ${colorSwatches}
                
                ${product.description ? `
                <div class="product-description">
                    <h3>Description</h3>
                    <p>${escapeHtml(product.description)}</p>
                </div>
                ` : ''}
                
                <div class="product-actions">
                    <a href="${whatsappUrl}" class="btn-order-whatsapp" target="_blank">
                        <i class="fab fa-whatsapp"></i>
                        <span>Order via WhatsApp</span>
                    </a>
                    
                    <a href="collections.html" class="btn-back-products">
                        <i class="fas fa-arrow-left"></i>
                        <span>Back to Products</span>
                    </a>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('productDetail').innerHTML = productDetailHTML;
    
    initProductGallerySwipe();
    
    renderRelatedProducts(product);
}

function initProductGallerySwipe() {
    const gallery = document.querySelector('.product-gallery');
    if (!gallery) return;
    
    let touchStartX = 0;
    let touchEndX = 0;
    const minSwipeDistance = 50;
    
    gallery.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    gallery.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        const swipeDistance = touchEndX - touchStartX;
        
        if (swipeDistance > minSwipeDistance) {
            changeGalleryImage(-1);
        } else if (swipeDistance < -minSwipeDistance) {
            changeGalleryImage(1);
        }
    }
}

function renderRelatedProducts(currentProduct) {
    const relatedContainer = document.getElementById('relatedProducts');
    if (!relatedContainer) return;
    
    const relatedProducts = products
        .filter(p => p.category === currentProduct.category && p.id !== currentProduct.id)
        .sort((a, b) => {
            if (!a.timestamp && !b.timestamp) return 0;
            if (!a.timestamp) return 1;
            if (!b.timestamp) return -1;
            return new Date(b.timestamp) - new Date(a.timestamp);
        })
        .slice(0, 10);
    
    if (relatedProducts.length === 0) {
        relatedContainer.style.display = 'none';
        return;
    }
    
    const categoryName = formatCategoryName(currentProduct.category);
    
    let relatedHTML = `
        <section class="showcase related-section">
            <div class="container">
                <div class="section-header">
                    <span class="section-tag">You May Also Like</span>
                    <h2 class="section-title">More from ${escapeHtml(categoryName)}</h2>
                </div>
                <div class="products-grid">
    `;
    
    relatedProducts.forEach(product => {
        const hasGlobalDiscount = CONFIG.GLOBAL_DISCOUNT > 0;
        const effectiveDiscount = hasGlobalDiscount ? CONFIG.GLOBAL_DISCOUNT : (product.discount || 0);
        const displayPrice = hasGlobalDiscount ? product.price * (1 - CONFIG.GLOBAL_DISCOUNT / 100) : product.price;
        const originalPrice = product.oldPrice || product.price;
        const showOldPrice = hasGlobalDiscount ? (originalPrice !== displayPrice) : (product.oldPrice && product.oldPrice !== product.price);
        const priceStyles = getPriceStyles(effectiveDiscount);
        const prodCategoryName = formatCategoryName(product.category);
        
        let badgeHTML = '';
        if (product.badge) {
            const badgeStyle = getBadgeStyle(product.badge, product.category, 0);
            badgeHTML = `<span class="badge" ${badgeStyle}>${escapeHtml(product.badge)}</span>`;
        }
        
        const imageHTML = getProductImageHTML(product, badgeHTML);
        
        relatedHTML += `
            <div class="product-card">
                <a href="product.html?id=${product.id}" class="product-link-overlay"></a>
                ${imageHTML}
                <div class="product-info">
                    <span class="product-category">${escapeHtml(prodCategoryName)}${product.brand ? ` <i class="fas fa-tag brand-tag"></i> <span class="brand-name">${escapeHtml(product.brand)}</span>` : ''}</span>
                    <h3 class="product-title"><a href="product.html?id=${product.id}">${escapeHtml(product.name)}</a></h3>
                    <div class="product-price-box">
                        <span class="price-current" style="color:${priceStyles.priceColor}">${CONFIG.CURRENCY_SYMBOL}${formatPrice(displayPrice)}</span>
                        ${showOldPrice ? `<span class="price-old" style="color:${priceStyles.oldPriceColor}">${CONFIG.CURRENCY_SYMBOL}${formatPrice(originalPrice)}</span>` : ''}
                        ${effectiveDiscount > 0 ? `<span class="discount-tag" style="background:${priceStyles.discountBadgeBg}">-${effectiveDiscount}%</span>` : ''}
                    </div>
                    <button class="product-btn whatsapp-btn" data-id="${product.id}">
                        <i class="fab fa-whatsapp"></i>
                        <span>Order via WhatsApp</span>
                    </button>
                </div>
            </div>
        `;
    });
    
    relatedHTML += `
                </div>
            </div>
        </section>
    `;
    
    relatedContainer.innerHTML = relatedHTML;
}

let currentGalleryIndex = 0;

function setGalleryImage(index) {
    const mainImage = document.getElementById('mainImage');
    if (!mainImage) return;
    
    const productId = new URLSearchParams(window.location.search).get('id');
    const product = products.find(p => p.id === parseInt(productId));
    if (!product) return;
    
    let images = [];
    if (product.image) images.push(product.image);
    if (product.backImage && product.backImage !== product.image) images.push(product.backImage);
    
    if (images[index]) {
        mainImage.src = images[index];
        const indicators = document.querySelectorAll('.indicator');
        indicators.forEach((ind, i) => {
            ind.classList.toggle('active', i === index);
        });
        currentGalleryIndex = index;
    }
}

function changeGalleryImage(direction) {
    const productId = new URLSearchParams(window.location.search).get('id');
    const product = products.find(p => p.id === parseInt(productId));
    if (!product) return;
    
    let images = [];
    if (product.image) images.push(product.image);
    if (product.backImage && product.backImage !== product.image) images.push(product.backImage);
    
    if (images.length <= 1) return;
    
    currentGalleryIndex = (currentGalleryIndex + direction + images.length) % images.length;
    setGalleryImage(currentGalleryIndex);
}

function initFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            renderProducts(filter);
        });
    });
}

function clearFiltersAndSearch() {
    currentSearchQuery = '';
    currentFilter = 'all';
    currentPriceRange = null;
    
    const searchInput = document.getElementById('searchInput');
    const navbarSearchInput = document.getElementById('navbarSearchInput');
    const searchOverlay = document.getElementById('searchOverlay');
    
    if (searchInput) searchInput.value = '';
    if (navbarSearchInput) navbarSearchInput.value = '';
    if (searchOverlay) searchOverlay.classList.remove('active');
    
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(b => b.classList.remove('active'));
    const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
    if (allBtn) allBtn.classList.add('active');
    
    initPriceSlider();
    currentPriceRange = null;
    
    renderProducts('all');
}

function initHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.slider-dot');
    let currentSlide = 0;

    if (slides.length === 0 || dots.length === 0) return;

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentSlide = index;
            showSlide(currentSlide);
        });
    });

    if (heroSliderInterval) clearInterval(heroSliderInterval);
    heroSliderInterval = setInterval(() => {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    }, 5000);

    function showSlide(index) {
        if (!slides[index] || !dots[index]) return;
        slides.forEach((slide, i) => {
            slide.classList.remove('active');
            dots[i].classList.remove('active');
        });
        slides[index].classList.add('active');
        dots[index].classList.add('active');
    }
}

function initTestimonials() {
    const track = document.querySelector('.testimonials-track');
    const prev = document.querySelector('.testimonial-prev');
    const next = document.querySelector('.testimonial-next');
    
    if (!track || !prev || !next) return;
    
    let index = 0;
    let touchStartX = 0;
    let touchEndX = 0;

    function getVisibleSlides() {
        if (window.innerWidth <= 400) return 1;
        if (window.innerWidth <= 768) return 1;
        if (window.innerWidth <= 1024) return 2;
        return 3;
    }

    function updatePosition() {
        const cards = track.querySelectorAll('.testimonial-card');
        if (cards.length === 0) return;
        const slideWidth = cards[0].offsetWidth + (window.innerWidth <= 768 ? 15 : 30);
        track.style.transform = `translateX(-${index * slideWidth}px)`;
    }

    next.addEventListener('click', () => {
        const maxIndex = Math.max(0, track.children.length - getVisibleSlides());
        if (index < maxIndex) {
            index++;
            updatePosition();
        }
    });

    prev.addEventListener('click', () => {
        if (index > 0) {
            index--;
            updatePosition();
        }
    });

    track.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    track.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                next.click();
            } else {
                prev.click();
            }
        }
    }

    window.addEventListener('resize', () => {
        index = 0;
        updatePosition();
    });
}

function initForms() {
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const nameEl = document.getElementById('name');
            const phoneEl = document.getElementById('phone');
            const emailEl = document.getElementById('email');
            const messageEl = document.getElementById('message');
            
            if (!nameEl || !phoneEl || !emailEl || !messageEl) {
                console.error('Form elements not found');
                return;
            }
            
            const name = nameEl.value.trim();
            const phone = phoneEl.value.trim();
            const email = emailEl.value.trim();
            const message = messageEl.value.trim();
            
            if (!name || !phone || !email || !message) {
                alert('Please fill in all fields');
                return;
            }
            
            if (!isValidEmail(email)) {
                alert('Please enter a valid email address');
                emailEl.focus();
                return;
            }
            
            if (!isValidPhone(phone)) {
                alert('Please enter a valid phone number');
                phoneEl.focus();
                return;
            }
            
            const whatsappMessage = `*Browz Clothing - New Inquiry*\n\n` +
                `*Name:* ${escapeHtml(name)}\n` +
                `*Phone:* ${escapeHtml(phone)}\n` +
                `*Email:* ${escapeHtml(email)}\n` +
                `*Message:* ${escapeHtml(message)}`;
            
            const encodedMessage = encodeURIComponent(whatsappMessage);
            const whatsappURL = `https://wa.me/94757034999?text=${encodedMessage}`;
            
            window.open(whatsappURL, '_blank');
            
            this.reset();
        });
    }
}

function initBackToTop() {
    const backToTop = document.getElementById('backToTop');
    if (!backToTop) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });

    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function initScrollReveal() {
    const scrollRevealElements = document.querySelectorAll('.scroll-reveal');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('revealed');
                }, index * 150);
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    });

    scrollRevealElements.forEach(el => observer.observe(el));
}

window.prevOffer = prevOffer;
window.nextOffer = nextOffer;
window.showOffer = showOffer;
window.setGalleryImage = setGalleryImage;
window.changeGalleryImage = changeGalleryImage;


