# Browz Clothing

Premium Clothing & Textile Showroom website for Addalaichenai, Sri Lanka.

**Live Site:** https://browzclothing.netlify.app

---

## Features

### Core Features
- **Responsive Design** - Optimized for all devices (desktop, tablet, mobile)
- **Product Showcase** - Dynamic product grid with filtering and search
- **Category Filters** - Filter products by category (Men, Women, Kids, etc.)
- **Price Range Slider** - Dual-handle slider for price filtering
- **Contact Form** - Send inquiries via WhatsApp
- **Google Maps Integration** - Showroom location display
- **WhatsApp Integration** - Direct ordering via WhatsApp
- **SEO Optimized** - Meta tags, Open Graph, Schema.org markup
- **Animated Sections** - Scroll animations with AOS library

### Product Features
- **Dynamic Product Loading** - Products loaded from Google Sheets
- **Image Flip Effect** - Hover to see back image (when available)
- **Discount Badges** - Color-coded discount percentages
- **Color Swatches** - Available colors displayed on product detail
- **Related Products** - Same-category products on detail page
- **Product Search** - Real-time search across all products
- **Load More Pagination** - Efficient loading on collections page

### Offers Carousel (Excel-Powered)
- **Owner-Friendly** - Add offers via Google Sheets (no code changes)
- **Multiple Offers** - Support for multiple active offers
- **Auto-Sliding** - Automatic carousel advancement (6 seconds)
- **Countdown Timer** - Per-offer countdown with auto-switch
- **Manual Navigation** - Desktop: arrows + dots | Mobile: swipe + dots
- **Mobile Swipe** - Swipe left/right to navigate on touch devices
- **Swipe Hint** - Visual hint for mobile users (hides after first swipe)
- **Hover Pause** - Auto-slide pauses on hover
- **Smooth Transitions** - Fade out/in animations for content
- **Staggered Animation** - Badge, note, countdown, button animate in sequence
- **Glowing Dots** - Active dot has glow + scale effect
- **Responsive Design** - Optimized for all devices

---

## Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Custom CSS with variables, Grid, Flexbox
- **JavaScript (ES6+)** - Vanilla JavaScript, no frameworks

### Libraries & Dependencies
- **Font Awesome 6.5.1** - Icon library
- **Google Fonts** - Playfair Display, Poppins
- **AOS 2.3.1** - Animate on scroll library
- **PapaParse 5.4.1** - CSV parsing for Google Sheets

### Data & Backend
- **Google Sheets** - Product and offers data storage
- **LocalStorage** - Client-side caching (5 min TTL)
- **SessionStorage** - Offers caching

### External Services
- **Netlify** - Hosting and deployment
- **Google Maps** - Location embed
- **WhatsApp API** - Direct messaging

---

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Mr.Nila-Tex
   ```

2. **Open in browser**
   ```bash
   # Simply open index.html in your browser
   # Or use a local server:
   npx serve .
   ```

3. **Configure Google Sheets**
   - Publish your Google Sheet to the web
   - Update the CSV URLs in `main.js` if needed

---

## Google Sheets Configuration

### Products Sheet
| Column | Description |
|--------|-------------|
| Product Name | Product title |
| Category | men, women, kids, fabric, etc. |
| Price | Current price (Rs.) |
| Old Price | Original price (for discount) |
| Discount % | Discount percentage |
| Front Image | Image URL |
| Back Image | Back view URL (optional) |
| Badge | Badge text (New, Hot, Sale, etc.) |
| Colors | Comma-separated colors |
| Brand | Brand name |
| Item Code | Product code |
| Description | Product description |

### Offers Sheet (Tab: `offerssheet`)
| Column | Description |
|--------|-------------|
| background_image | Full URL to banner image |
| badge_text | Short badge text |
| title | Main offer title |
| subtitle | Description (supports HTML) |
| end_date | End date (2026-04-30T23:59:59 or 4/30/2026 23:59:59) |
| is_active | Yes or No |

---

## File Structure

```
Mr.Nila-Tex/
├── index.html              # Home page
├── collections.html         # Collections page with filters
├── product.html           # Product detail page
├── main.js                # JavaScript (products, offers, interactions)
├── styles.css             # All styles
├── images/
│   ├── products/          # Product images
│   └── sections/          # Section banners
├── sitemap.xml            # SEO sitemap
├── robots.txt             # Search engine rules
├── netlify.toml           # Netlify config
├── README.md              # This file
└── PROJECT_REPORT.txt    # Detailed documentation
```

---

## Deployment

### Netlify (Recommended)
1. Push to GitHub repository
2. Connect repository to Netlify
3. Deploy automatically on push

### Manual Deploy
1. Upload all files to Netlify drop or any static host
2. Ensure `index.html` is in root directory

---

## Customization

### Configuration (main.js)
```javascript
const CONFIG = {
    SHEET_ID: '2PACX-1vSpVJWz6tWq-XwbX-O7J5Qeh64yCO5Wv5SLZyRxUwfiEzbQ3X3OyFV6l41UbuAy1dpFnLwAAsWPe3Aw',
    OFFERS_SHEET_GID: '291050963',
    WHATSAPP_NUMBER: '94757034999',
    SHOP_NAME: 'Browz Clothing',
    SHOP_START_YEAR: 2022,
    CURRENCY_SYMBOL: 'Rs. ',
    PRODUCT_CODE_PREFIX: 'BC',
    // ... more options
};
```

### Adding Products
1. Open your Products Google Sheet
2. Add product row with required columns
3. Ensure the sheet is published to web
4. Refresh website - changes appear automatically!

### Adding Offers
1. Open your Offers Google Sheet
2. Add offer row with all columns
3. Set `is_active` to "Yes"
4. Refresh website - changes appear automatically!

---

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## License

All rights reserved. Browz Clothing

---

## Contact

- **Phone:** +94 75 703 4999
- **Email:** Browzclothing@gmail.com
- **Location:** 144 Union Road, Addalaichenai, Sri Lanka
- **WhatsApp:** [Chat with us](https://wa.me/94757034999)
