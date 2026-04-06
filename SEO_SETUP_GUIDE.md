# SEO Setup Guide - Browz Clothing

## What Was Implemented

### 1. Schema.org Structured Data (JSON-LD)

#### index.html
- **LocalBusiness/Store Schema** - Business info (address, hours, contact)
- **FAQPage Schema** - 6 common questions with answers for rich results
- **BreadcrumbList Schema** - Navigation trail

#### collections.html
- **LocalBusiness/Store Schema** - Business info
- **BreadcrumbList Schema** - Home > Collections

#### product.html
- **Product Schema** - Dynamic product data (populated via JavaScript)
- **BreadcrumbList Schema** - Home > Collections > Product
- **LocalBusiness Schema** - Store information

### 2. Meta Tags Added
- Pinterest rich pin meta tag (all pages)
- Enhanced robots meta tag with preview settings (collections.html)
- Twitter Card tags (product.html - was missing)
- Open Graph image dimensions

### 3. Technical SEO
- Created `404.html` - Custom error page
- sitemap.xml - Already present
- robots.txt - Already present

---

## Google Indexing Setup (You Need To Do)

### Step 1: Create Google Search Console Account
1. Go to: https://search.google.com/search-console
2. Click "Add property"
3. Choose "URL prefix" or "Domain"
4. For URL prefix: Enter `https://browzclothing.netlify.app`

### Step 2: Verify Ownership
Choose one of these methods:

#### Option A: HTML File Upload (Recommended for Netlify)
1. Download your verification file (HTML meta tag or file)
2. Netlify: Go to Site settings > Domain management > Add verification file
3. Or: Add the meta tag to index.html

#### Option B: Add Meta Tag to index.html
Add this to the `<head>` section of index.html:
```html
<meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" />
```

### Step 3: Submit Sitemap
1. In Search Console, go to "Sitemaps"
2. Enter: `sitemap.xml`
3. Click "Submit"

### Step 4: Request Indexing
1. Go to "URL Inspection"
2. Enter your homepage URL
3. Click "Request Indexing"

---

## Google Tag Manager Setup (For Event Tracking)

### Step 1: Create GTM Account
1. Go to: https://tagmanager.google.com
2. Click "Create Account"
3. Fill in:
   - Account name: Browz Clothing
   - Container name: Browz Website
   - Target platform: Web

### Step 2: Install GTM on Your Site
Add this code immediately after the `<head>` tag on ALL pages:

```html
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
<!-- End Google Tag Manager -->

<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
```

Replace `GTM-XXXXXXX` with your actual GTM ID.

### Step 3: Create Event Triggers in GTM

#### WhatsApp Click Tracking
1. In GTM, go to "Triggers" > "New"
2. Name: "Click - WhatsApp Button"
3. Trigger type: "Click - All Elements"
4. Click filters:
   - Page URL contains product.html OR collections.html
   - Click URL contains wa.me OR whatsapp
5. Save

#### Product Page View Tracking
1. Create trigger: "Page View - Product Pages"
2. Trigger type: "Page View"
3. This trigger fires on: "Page URL contains product.html"

#### Form/Contact Tracking
1. Create trigger: "Click - Contact Form Submit"
2. Trigger type: "Click - All Elements"
3. Click filter: Click ID equals contactFormSubmit (or your form ID)

### Step 4: Connect to Google Analytics 4

1. Create GA4 property at: https://analytics.google.com
2. Get your Measurement ID (G-XXXXXXXXXX)
3. In GTM, create a tag:
   - Tag type: "Google Analytics: GA4 Configuration"
   - Measurement ID: G-XXXXXXXXXX
   - Trigger: "All Pages"

#### Create Event Tags for Tracking:
- **WhatsApp Click**: GA4 Event tag with event name "whatsapp_click"
- **Product View**: GA4 Event tag with event name "product_view"
- **Contact Form**: GA4 Event tag with event name "contact_form_submit"

---

## Events to Track

### Important Events for E-commerce

| Event Name | Trigger | Purpose |
|------------|---------|---------|
| `whatsapp_click` | WhatsApp button click | Track inquiry starts |
| `product_view` | Product page load | Track product interest |
| `collection_view` | Collections page load | Track browsing |
| `search_use` | Search performed | Track search behavior |
| `filter_use` | Filter selected | Track preferences |
| `contact_form_submit` | Form submitted | Track leads |

### Custom Dimensions to Set Up in GA4

1. **Product Category** - Dimension for product category
2. **Product Brand** - Dimension for brand
3. **Product Price** - Metric for price
4. **User Location** - Dimension (from geolocation)

---

## Rich Results Testing

Test your pages at: https://search.google.com/test/rich-results

### What to Expect

#### Homepage (index.html)
- LocalBusiness rich card
- FAQ accordion (if ranking for question queries)

#### Collections Page
- Breadcrumb in search results
- LocalBusiness info

#### Product Page (after JS loads)
- Product rich results with price, availability
- Breadcrumb navigation
- Star ratings

---

## Monitoring & Maintenance

### Weekly Tasks
1. Check Search Console for crawl errors
2. Review search queries in Search Console
3. Check indexing status

### Monthly Tasks
1. Update product schema if prices change significantly
2. Review FAQ schema - add/remove questions based on customer queries
3. Check Core Web Vitals performance

### Tools to Use
- **Google Search Console** - Indexing, ranking, errors
- **Google Analytics 4** - Traffic, conversions, events
- **Google PageSpeed Insights** - Performance
- **Schema.org Validator** - Structured data testing
- **GTM Preview Mode** - Test tags before publishing

---

## Important Notes

1. **Product Schema is Dynamic** - The Product JSON-LD in product.html is a template. JavaScript updates it with actual product data when the page loads.

2. **Netlify Hosting** - Your site is hosted on Netlify. For custom verification files, upload them via Netlify dashboard.

3. **Sitemap Updates** - The sitemap.xml updates automatically when you add new pages. Submit updated sitemap to Search Console monthly.

4. **Indexing Priority** - After major updates, use "URL Inspection" to request immediate re-indexing of changed pages.

---

## Need Help?

If you need assistance with:
- GTM event setup - Refer to GTM documentation
- GA4 configuration - Check GA4 documentation
- Schema validation - Use https://search.google.com/test/rich-results

For Netlify-specific hosting questions, check Netlify docs or support.
