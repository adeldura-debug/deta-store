(() => {
  'use strict';

  const config = window.DETA_SUPABASE_URL && window.DETA_SUPABASE_ANON_KEY;
  const db = config && window.supabase?.createClient(window.DETA_SUPABASE_URL, window.DETA_SUPABASE_ANON_KEY);
  const page = document.body.dataset.page || 'home';
  const localeKey = 'detaLocale';
  const cartKey = 'detaCart';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const money = value => `${Number(value || 0).toFixed(2)} $`;
  const state = { locale: localStorage.getItem(localeKey) === 'en' ? 'en' : 'ar', products: [], discounts: [], brand: null, loaded: false, filter: 'all', query: '', cart: loadCart(), pickedProduct: null, pickedColor: {name:'Onyx',hex:'#181817'}, designImage: '', designFileName: '', toastTimer: 0, cartTimer: 0 };

  function loadCart() {
    try {
      const value = JSON.parse(localStorage.getItem(cartKey) || '[]');
      return Array.isArray(value) ? value.map(item => ({...item, quantity: Math.max(1, Number(item.quantity) || 1)})) : [];
    } catch { return []; }
  }

  function t(ar, en) { return state.locale === 'en' ? en : ar; }

  function setLocale(locale) {
    state.locale = locale;
    localStorage.setItem(localeKey, locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    $$('[data-ar][data-en]').forEach(el => { el.innerHTML = el.dataset[locale]; });
    const toggle = $('.language-toggle');
    if (toggle) toggle.textContent = locale === 'ar' ? 'EN' : 'عربي';
    const search = $('[data-product-search]');
    if (search) search.placeholder = locale === 'ar' ? search.dataset.placeholderAr : search.dataset.placeholderEn;
    const empty = $('[data-empty]');
    if (empty) empty.textContent = t('لا توجد قطع في هذا القسم الآن.','No pieces in this selection yet.');
    const menu = $('.mobile-menu');
    if (menu) menu.setAttribute('aria-label', t('فتح القائمة', 'Open menu'));
    const closeCartButton = $('[data-close-cart]');
    if (closeCartButton) closeCartButton.setAttribute('aria-label', t('إغلاق الحقيبة', 'Close bag'));
    if (state.loaded) filterAndRenderProducts();
    else renderProducts();
    renderCart();
    updatePreviewText();
    if (state.pickedProduct) syncCustomizerProduct(state.pickedProduct);
    if (state.brand) applyBrandSettings(state.brand);
  }

  function imageUrl(value) {
    if (!value) return '';
    if (typeof value !== 'string') value = value.url || '';
    if (/^https?:\/\//i.test(value) || value.startsWith('data:image/')) return value;
    const clean = value.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
    return `${window.DETA_SUPABASE_URL}/storage/v1/object/public/product-images/${clean}`;
  }

  function productImage(product) {
    const images = product.images;
    const candidate = Array.isArray(images) ? images[0] : images || product.image_url || product.image || '';
    return imageUrl(candidate);
  }

  function kindOf(product) {
    const label = `${product?.category || ''} ${product?.name_ar || ''} ${product?.name_en || ''}`.toLowerCase();
    if (/mug|cup|كوب|مج/.test(label)) return 'mug';
    if (/hood|sweat|هود|سويت/.test(label)) return 'hoodie';
    if (/tee|t-?shirt|shirt|تي ?شيرت|نص ?كم|كنزة|قميص/.test(label)) return 'tee';
    return 'tee';
  }

  function kindLabel(kind) {
    return ({hoodie:t('هودي','HOODIE'),tee:t('كنزة نص كم','TEE'),mug:t('كوب','MUG')})[kind] || t('قطعة','PIECE');
  }

  function productName(product) { return state.locale === 'en' ? (product.name_en || product.name_ar) : (product.name_ar || product.name_en); }
  function productDescription(product) { return state.locale === 'en' ? (product.description_en || product.description_ar || '') : (product.description_ar || product.description_en || ''); }

  function discountFor(product) {
    const now = Date.now();
    const basePrice = Number(product.price || 0);
    const comparePrice = Number(product.old_price || 0) > basePrice ? Number(product.old_price) : basePrice;
    let savings = basePrice * (Number(product.discount_percent || 0) / 100);
    let label = savings ? `${Number(product.discount_percent)}%` : '';
    for (const discount of state.discounts) {
      if (discount.start_date && new Date(discount.start_date).getTime() > now) continue;
      if (discount.end_date && new Date(discount.end_date).getTime() < now) continue;
      if (Array.isArray(discount.products) && discount.products.length && !discount.products.includes(product.id)) continue;
      const candidate = discount.type === 'percentage'
        ? basePrice * Number(discount.value || 0) / 100
        : Number(discount.value || 0);
      if (candidate > savings) {
        savings = candidate;
        label = discount.type === 'percentage' ? `${discount.value}%` : `${Number(discount.value).toFixed(0)} $`;
      }
    }
    if (!label && comparePrice > basePrice) {
      label = `${Math.round((comparePrice - basePrice) / comparePrice * 100)}%`;
    }
    const final = Math.max(0, basePrice - savings);
    return { original: comparePrice, price: Math.round(final * 100) / 100, savings: Math.round((comparePrice - final) * 100) / 100, label };
  }

  function renderProducts(list = state.products) {
    const root = $('[data-product-grid]');
    if (!root) return;
    const filtered = list;
    const home = page === 'home';
    const shown = home ? filtered.slice(0, 4) : filtered;
    if (!state.loaded) return;
    if (!state.products.length) {
      root.innerHTML = `<div class="loading-card"><span>${escapeHTML(t('لا توجد قطع منشورة الآن. عُد قريبًا.','No pieces are published yet. Check back soon.'))}</span></div>`;
      return;
    }
    if (!shown.length) {
      root.innerHTML = '';
      const empty = $('[data-empty]');
      if (empty) empty.hidden = false;
      return;
    }
    const empty = $('[data-empty]');
    if (empty) empty.hidden = true;
    root.innerHTML = shown.map((product, index) => {
      const title = escapeHTML(productName(product));
      const desc = escapeHTML(productDescription(product) || kindLabel(kindOf(product)));
      const image = productImage(product);
      const price = discountFor(product);
      const imageMarkup = image ? `<img src="${escapeHTML(image)}" alt="${title}" loading="lazy" decoding="async">` : `<div class="product-fallback"><span>DETA</span><small>${escapeHTML(kindLabel(kindOf(product)))}</small></div>`;
      const discount = price.savings ? `<span class="product-tag">${escapeHTML(t('خصم','SAVE'))} ${escapeHTML(price.label)}</span>` : '';
      return `<article class="product-card" style="--card-index:${index}">
        <button class="product-media" type="button" data-customize-product="${escapeHTML(product.id)}" aria-label="${escapeHTML(t('خصص ','Customize ')+productName(product))}">
          ${imageMarkup}<span class="product-index">D / ${String(index + 1).padStart(2,'0')}</span><span class="product-category">${escapeHTML(kindLabel(kindOf(product)))}</span>${discount}
        </button>
        <div class="product-info"><div><h3 class="product-name">${title}</h3><p class="product-subtitle">${desc}</p></div><div class="product-price">${price.savings ? `<del>${money(price.original)}</del>` : ''}${money(price.price)}</div></div>
        <button class="product-action" type="button" data-customize-product="${escapeHTML(product.id)}"><span>${escapeHTML(t('خصص القطعة','Customize piece'))}</span><b>↙</b></button>
      </article>`;
    }).join('');
    $$('[data-customize-product]', root).forEach(button => button.addEventListener('click', () => openCustomizer(button.dataset.customizeProduct)));
    const total = $('[data-product-total]');
    if (total) total.textContent = String(state.products.length).padStart(2, '0');
  }

  function persistCart() {
    try {
      localStorage.setItem(cartKey, JSON.stringify(state.cart));
      const count = state.cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
      $$('[data-cart-count]').forEach(el => el.textContent = String(count));
    } catch {
      showToast(t('تعذّر حفظ السلة. أزل تصميمًا كبيرًا أو قطعة من الحقيبة.','The bag is too large to save. Remove a large design or a piece.'));
    }
  }

  function cartItemPrice(item) {
    const product = state.products.find(entry => entry.id === item.product);
    return product ? discountFor(product).price : Number(item.price || 0);
  }

  function renderCart() {
    persistCart();
    const list = $('[data-cart-items]');
    if (!list) return;
    const totalEl = $('[data-cart-total]');
    const discountEl = $('[data-cart-discount]');
    const discountValue = $('[data-cart-discount-value]');
    if (!state.cart.length) {
      list.innerHTML = `<p class="cart-empty">${escapeHTML(t('حقيبتك تنتظر القطعة المناسبة.','Your bag is waiting for the right piece.'))}</p>`;
      if (totalEl) totalEl.textContent = money(0);
      if (discountEl) discountEl.hidden = true;
      return;
    }
    let total = 0;
    let savings = 0;
    list.innerHTML = state.cart.map((item, index) => {
      const product = state.products.find(entry => entry.id === item.product);
      const unitPrice = cartItemPrice(item);
      const original = product ? discountFor(product).original : Number(item.original_price || unitPrice);
      const quantity = Math.max(1, Number(item.quantity || 1));
      total += unitPrice * quantity;
      savings += Math.max(0, original - unitPrice) * quantity;
      const title = product ? productName(product) : item.name || t('قطعة DETA','DETA piece');
      const thumb = item.design_image || (product && productImage(product));
      const safeThumb = typeof thumb === 'string' && (/^https:\/\//i.test(thumb) || /^data:image\/(?:png|jpeg|webp);base64,/i.test(thumb)) ? thumb : '';
      const thumbMarkup = safeThumb ? `<img src="${escapeHTML(safeThumb)}" alt="">` : 'D.';
      const custom = item.customization || {};
      const details = [item.size && `${t('المقاس','Size')} ${item.size}`,item.color && `${t('اللون','Color')} ${item.color}`,custom.text && `“${custom.text}”`,custom.fileName].filter(Boolean).join(' · ');
      return `<article class="cart-item"><div class="cart-item-thumb" style="--cart-color:${escapeHTML(item.color_hex || '#dedbd2')}">${thumbMarkup}</div><div class="cart-item-info"><h3>${escapeHTML(title)}</h3><p>${escapeHTML(kindLabel(item.kind || (product && kindOf(product)) || 'tee'))}${details ? ` · ${escapeHTML(details)}` : ''}</p><div class="cart-item-controls"><button type="button" class="cart-qty-btn" data-qty="-1" data-index="${index}" aria-label="${escapeHTML(t('تقليل الكمية','Decrease quantity'))}">−</button><span>${quantity}</span><button type="button" class="cart-qty-btn" data-qty="1" data-index="${index}" aria-label="${escapeHTML(t('زيادة الكمية','Increase quantity'))}">+</button><button type="button" class="cart-remove" data-remove-item="${index}" aria-label="${escapeHTML(t('إزالة','Remove'))}">×</button></div></div><strong class="cart-item-price">${money(unitPrice * quantity)}</strong></article>`;
    }).join('');
    if (totalEl) totalEl.textContent = money(total);
    if (discountEl) discountEl.hidden = savings <= 0;
    if (discountValue) discountValue.textContent = `− ${money(savings)}`;
    list.querySelectorAll('[data-qty]').forEach(button => button.addEventListener('click', () => {
      const item = state.cart[Number(button.dataset.index)];
      if (!item) return;
      item.quantity = Math.max(1, Number(item.quantity || 1) + Number(button.dataset.qty));
      renderCart();
    }));
    list.querySelectorAll('[data-remove-item]').forEach(button => button.addEventListener('click', () => {
      state.cart.splice(Number(button.dataset.removeItem), 1);
      renderCart();
    }));
  }

  function showToast(message) {
    const toast = $('[data-toast]');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
  }

  function setModalVisibility(selector, visible) {
    const modal = $(selector);
    if (!modal) return;
    modal.hidden = !visible;
    document.body.classList.toggle('has-modal', visible);
  }

  function openCart() {
    const drawer = $('[data-cart-drawer]');
    if (!drawer) return;
    clearTimeout(state.cartTimer);
    renderCart();
    const overlay = $('[data-cart-overlay]');
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden','false');
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden','false');
    $('[data-close-cart]')?.focus({preventScroll:true});
  }

  function closeCart() {
    const drawer = $('[data-cart-drawer]');
    if (!drawer) return;
    const overlay = $('[data-cart-overlay]');
    if (!drawer.classList.contains('is-open') && overlay.hidden) return;
    clearTimeout(state.cartTimer);
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden','true');
    state.cartTimer = setTimeout(() => {
      if (drawer.classList.contains('is-open')) return;
      overlay.hidden = true;
      overlay.setAttribute('aria-hidden','true');
      $('.cart-open')?.focus({preventScroll:true});
    }, 470);
  }

  function openCustomizer(productId) {
    if (!state.products.length) {
      showToast(t('القطع غير متاحة الآن.','The collection is not available right now.'));
      return;
    }
    const product = state.products.find(entry => entry.id === productId) || state.products[0];
    state.pickedProduct = product;
    state.designImage = '';
    state.designFileName = '';
    const file = $('[data-design-file]');
    if (file) file.value = '';
    const text = $('[data-custom-text]');
    if (text) text.value = '';
    const fileName = $('[data-file-name]');
    if (fileName) fileName.textContent = t('PNG أو JPG أو WEBP · حتى 8MB','PNG, JPG or WEBP · up to 8MB');
    const image = $('[data-preview-image]');
    if (image) { image.hidden = true; image.removeAttribute('src'); }
    const designText = $('[data-preview-text]');
    if (designText) designText.textContent = '';
    const feedback = $('[data-custom-feedback]');
    if (feedback) feedback.textContent = '';
    syncCustomizerProduct(product);
    const defaultColor = $('.color-swatch');
    if (defaultColor) chooseColor(defaultColor);
    setModalVisibility('[data-custom-modal]', true);
    document.documentElement.style.overflow = 'hidden';
    $('[data-close-custom]')?.focus({preventScroll:true});
  }

  function closeCustomizer() {
    setModalVisibility('[data-custom-modal]', false);
    document.documentElement.style.overflow = '';
  }

  function normalizeColor(value, index) {
    const named = {black:'#181817',onyx:'#181817',white:'#eeeae2',cream:'#dedbd2',stone:'#dedbd2',sage:'#768075',green:'#57644e',red:'#9d403b',oxide:'#9d403b',beige:'#d3af76',oat:'#d3af76',blue:'#4c647d',navy:'#253348',gray:'#8d8d89',grey:'#8d8d89'};
    const text = String(value || '').trim();
    const hex = /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(text) ? text : named[text.toLowerCase()] || ['#181817','#dedbd2','#768075','#9d403b','#d3af76'][index % 5];
    return {name:text || ['Onyx','Stone','Sage','Oxide','Oat'][index % 5],hex};
  }

  function syncCustomizerProduct(product) {
    if (!product) return;
    const stage = $('[data-garment-stage]');
    const kind = kindOf(product);
    if (stage) stage.dataset.kind = kind;
    const name = $('[data-preview-color-name]');
    if (name) name.textContent = `${String((product.name_en || kind).slice(0,16)).toUpperCase()}`;
    const productSelect = $('[data-custom-product]');
    if (productSelect) {
      productSelect.innerHTML = state.products.map(item => `<option value="${escapeHTML(item.id)}">${escapeHTML(productName(item))} — ${escapeHTML(kindLabel(kindOf(item)))}</option>`).join('');
      productSelect.value = product.id;
    }
    const select = $('[data-custom-size]');
    if (select && Array.isArray(product.sizes) && product.sizes.length) {
      const current = select.value;
      select.innerHTML = product.sizes.map(size => `<option value="${escapeHTML(size)}">${escapeHTML(size)}</option>`).join('');
      if (product.sizes.includes(current)) select.value = current;
    }
    const swatches = $('.color-swatches');
    if (swatches) {
      const colors = Array.isArray(product.colors) && product.colors.length ? product.colors.slice(0,8) : ['Onyx','Stone','Sage','Oxide','Oat'];
      swatches.innerHTML = colors.map((color,index) => {
        const entry = normalizeColor(color,index);
        return `<button type="button" class="color-swatch${index === 0 ? ' is-selected' : ''}" data-color="${escapeHTML(entry.hex)}" data-color-name="${escapeHTML(entry.name)}" style="--swatch:${escapeHTML(entry.hex)}" aria-label="${escapeHTML(entry.name)}"></button>`;
      }).join('');
      swatches.querySelectorAll('.color-swatch').forEach(button => button.addEventListener('click', () => chooseColor(button)));
      chooseColor($('.color-swatch', swatches));
    }
    const customPrice = $('[data-custom-price]');
    if (customPrice) customPrice.textContent = money(discountFor(product).price);
  }

  function chooseColor(button) {
    if (!button) return;
    $$('.color-swatch').forEach(item => item.classList.toggle('is-selected', item === button));
    state.pickedColor = {name:button.dataset.colorName || 'Onyx',hex:button.dataset.color || '#181817'};
    const stage = $('[data-garment-stage]');
    if (stage) {
      stage.style.setProperty('--garment-color',state.pickedColor.hex);
      stage.style.setProperty('--garment-shadow',darken(state.pickedColor.hex));
      stage.style.setProperty('--print-color',isLight(state.pickedColor.hex)?'#181817':'#f1ede2');
    }
    const label = $('[data-selected-color]');
    if (label) label.textContent = state.pickedColor.name.toUpperCase();
    const hex = $('[data-preview-hex]');
    if (hex) hex.textContent = state.pickedColor.hex.toUpperCase();
  }

  function darken(hex) {
    const parsed = hex.match(/[\da-f]{2}/gi);
    if (!parsed || parsed.length < 3) return '#0c0c0b';
    return `#${parsed.slice(0,3).map(part=>Math.max(0,Math.round(parseInt(part,16)*.72)).toString(16).padStart(2,'0')).join('')}`;
  }
  function isLight(hex) {
    const parsed = hex.match(/[\da-f]{2}/gi);
    if (!parsed || parsed.length < 3) return false;
    const [r,g,b] = parsed.slice(0,3).map(part=>parseInt(part,16));
    return (r*299+g*587+b*114)/1000 > 155;
  }

  function updatePreviewText() {
    const input = $('[data-custom-text]');
    const value = input?.value?.trim() || '';
    const textEl = $('[data-preview-text]');
    const mugText = $('[data-mug-text]');
    if (textEl) textEl.textContent = value;
    if (mugText) mugText.textContent = value;
    const count = $('[data-char-count]');
    if (count) count.textContent = `${input.value.length} / 48`;
  }

  function showDesignPreview(dataUrl) {
    const garmentImage = $('[data-preview-image]');
    const mugImage = $('[data-mug-image]');
    [garmentImage,mugImage].forEach(image => {
      if (!image) return;
      image.src = dataUrl;
      image.hidden = false;
    });
  }

  function readAndCompressImage(file) {
    return new Promise((resolve,reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        const size = Math.min(1000 / image.width, 1000 / image.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1,Math.round(image.width*size));
        canvas.height = Math.max(1,Math.round(image.height*size));
        const context = canvas.getContext('2d');
        context.clearRect(0,0,canvas.width,canvas.height);
        context.drawImage(image,0,0,canvas.width,canvas.height);
        URL.revokeObjectURL(objectUrl);
        canvas.toBlob(async blob => {
          if (!blob) { reject(new Error(t('لم نتمكن من قراءة الصورة.','Could not read this image.'))); return; }
          let finalBlob = blob;
          if (finalBlob.size > 340 * 1024) {
            const smaller = document.createElement('canvas');
            smaller.width = Math.max(1,Math.round(canvas.width*.76));
            smaller.height = Math.max(1,Math.round(canvas.height*.76));
            smaller.getContext('2d').drawImage(canvas,0,0,smaller.width,smaller.height);
            finalBlob = await new Promise(done=>smaller.toBlob(done,'image/webp',.62)) || blob;
          }
          if (finalBlob.size > 520 * 1024) { reject(new Error(t('حجم التصميم كبير بعد الضغط. جرّب صورة أصغر.','The artwork is still too large after compression. Try a smaller image.'))); return; }
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error(t('تعذّر قراءة ملف التصميم.','Could not read the artwork file.')));
          reader.readAsDataURL(finalBlob);
        },'image/webp',.76);
      };
      image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error(t('هذا الملف ليس صورة صالحة.','This file is not a valid image.'))); };
      image.src = objectUrl;
    });
  }

  async function handleDesignFile(file) {
    const feedback = $('[data-custom-feedback]');
    if (!file) return;
    if (!['image/png','image/jpeg','image/webp'].includes(file.type)) { feedback.textContent = t('اختر ملف PNG أو JPG أو WEBP.','Choose a PNG, JPG, or WEBP file.'); return; }
    if (file.size > 8 * 1024 * 1024) { feedback.textContent = t('الحد الأقصى لحجم الملف 8MB.','The file limit is 8MB.'); return; }
    feedback.textContent = t('نجهّز المعاينة…','Preparing your preview…');
    try {
      state.designImage = await readAndCompressImage(file);
      state.designFileName = file.name.slice(0,90);
      showDesignPreview(state.designImage);
      $('[data-file-name]').textContent = `${state.designFileName} · ${Math.round((state.designImage.length*3/4)/1024)} KB`;
      feedback.textContent = '';
    } catch (error) {
      state.designImage = '';
      feedback.textContent = error.message;
    }
  }

  function addCustomizedItem() {
    const product = state.pickedProduct;
    if (!product) return;
    const kind = kindOf(product);
    const quantity = Math.max(1,Number($('[data-custom-quantity]')?.value || 1));
    const size = kind === 'mug' ? 'OS' : ($('[data-custom-size]')?.value || 'M');
    const customText = $('[data-custom-text]')?.value?.trim() || '';
    const unit = discountFor(product);
    const customization = {text:customText,fileName:state.designFileName || ''};
    const existing = state.cart.find(item => item.product === product.id && item.size === size && item.color === state.pickedColor.name && item.customization?.text === customText && item.design_image === state.designImage);
    if (existing) existing.quantity += quantity;
    else state.cart.push({product:product.id,name_ar:product.name_ar,name_en:product.name_en,name:product.name_ar || product.name_en,kind,size,color:state.pickedColor.name,color_hex:state.pickedColor.hex,quantity,price:unit.price,original_price:unit.original,discount:unit.savings,customization,design_image:state.designImage || ''});
    renderCart();
    closeCustomizer();
    openCart();
    showToast(t('أُضيفت قطعتك إلى الحقيبة.','Your piece is in the bag.'));
  }

  async function submitOrder(event) {
    event.preventDefault();
    const feedback = $('[data-checkout-feedback]');
    if (!state.cart.length) { feedback.textContent = t('أضف قطعة إلى الحقيبة أولًا.','Add a piece to your bag first.'); return; }
    if (!db) { feedback.textContent = t('تعذّر الاتصال بالمتجر. حاول مجددًا لاحقًا.','The store is unavailable. Please try again later.'); return; }
    const button = $('[data-checkout-form] .checkout-submit');
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const payloadItems = state.cart.map(item => {
      const product = state.products.find(entry => entry.id === item.product);
      const price = product ? discountFor(product) : {price:Number(item.price || 0),original:Number(item.original_price || item.price || 0),savings:Number(item.discount || 0)};
      const customization = item.customization || {};
      return {product:item.product,name:item.name_ar || item.name || (product && productName(product)) || 'DETA',name_ar:item.name_ar || item.name || '',name_en:item.name_en || '',kind:item.kind || (product && kindOf(product)) || 'tee',size:item.size || '',color:item.color || '',color_hex:item.color_hex || '',quantity:Math.max(1,Number(item.quantity || 1)),price:price.price,original_price:price.original,discount:price.savings,customization:{text:customization.text || '',fileName:customization.fileName || ''},design_image:item.design_image || ''};
    });
    const subtotal = payloadItems.reduce((sum,item)=>sum+item.price*item.quantity,0);
    const discountTotal = payloadItems.reduce((sum,item)=>sum+item.discount*item.quantity,0);
    const row = {customer_name:String(form.customer_name).trim(),customer_phone:String(form.customer_phone).trim(),customer_email:String(form.customer_email||'').trim()||null,customer_address:String(form.customer_address).trim(),items:payloadItems,total:Math.round(subtotal*100)/100,discount:Math.round(discountTotal*100)/100,status:'new'};
    if (!row.customer_name || !row.customer_phone || !row.customer_address) { feedback.textContent = t('أكمل بيانات التوصيل.','Complete the delivery details.'); return; }
    button.disabled = true;
    button.querySelector('span').textContent = t('جارٍ إرسال الطلب…','Sending your order…');
    feedback.textContent = '';
    try {
      const {error} = await db.from('orders').insert(row);
      if (error) throw error;
      state.cart = [];
      state.coupon = null;
      renderCart();
      $('[data-checkout-form]').reset();
      feedback.textContent = t('وصل طلبك إلى DETA. سنتواصل معك لتأكيد التفاصيل.','Your order reached DETA. We’ll contact you to confirm the details.');
      showToast(t('تم إرسال طلبك بنجاح.','Your order has been placed.'));
      setTimeout(closeCart,1700);
    } catch (error) {
      feedback.textContent = error.message || t('تعذّر إرسال الطلب. حاول مرة أخرى.','Could not place the order. Please try again.');
    } finally {
      button.disabled = false;
      button.querySelector('span').textContent = t('إرسال الطلب','Place order');
    }
  }

  function applyProductFilter(filter) {
    state.filter = filter;
    $$('.filter-chip').forEach(button => button.classList.toggle('is-active', button.dataset.filter === filter));
    filterAndRenderProducts();
  }

  function filterAndRenderProducts() {
    const query = state.query.trim().toLocaleLowerCase();
    const filtered = state.products.filter(product => {
      const matchesKind = state.filter === 'all' || kindOf(product) === state.filter;
      const contents = `${product.name_ar || ''} ${product.name_en || ''} ${product.description_ar || ''} ${product.description_en || ''} ${product.category || ''}`.toLocaleLowerCase();
      return matchesKind && (!query || contents.includes(query));
    });
    renderProducts(filtered);
  }

  function applyBrandSettings(settings) {
    if (!settings) return;
    state.brand = settings;
    const heroTitle = $('[data-brand-hero-title]');
    if (heroTitle && settings.hero_title_ar && state.locale === 'ar') heroTitle.innerHTML = safeRichText(settings.hero_title_ar);
    if (heroTitle && settings.hero_title_en && state.locale === 'en') heroTitle.innerHTML = safeRichText(settings.hero_title_en);
    const heroText = $('[data-brand-hero-text]');
    if (heroText) heroText.textContent = state.locale === 'en' ? settings.hero_text_en || '' : settings.hero_text_ar || '';
    if (settings.hero_image) {
      const image = $('.hero-image');
      const url = /^https?:\/\//i.test(settings.hero_image) ? settings.hero_image : imageUrl(settings.hero_image);
      if (image && /^https:\/\//i.test(url)) image.style.backgroundImage = `url("${url.replace(/["\\]/g,'')}")`;
    }
    const customTitle = $('.custom-feature-copy h2');
    const customText = $('.custom-feature-copy>p:not(.eyebrow)');
    if (customTitle && settings.custom_title_ar && state.locale === 'ar') customTitle.innerHTML = safeRichText(settings.custom_title_ar);
    if (customText && settings.custom_text_ar && state.locale === 'ar') customText.textContent = settings.custom_text_ar;
    const collectionTitle = $('.section-heading h2');
    if (collectionTitle && settings.collection_title_ar && state.locale === 'ar') collectionTitle.textContent = settings.collection_title_ar;
    const storyTitle = $('[data-brand-story-title]');
    const storyText = $('[data-brand-story-text]');
    const storyTitleValue = state.locale === 'en' ? settings.intro_title_en : settings.intro_title_ar;
    const storyTextValue = state.locale === 'en' ? settings.intro_text_en : settings.intro_text_ar;
    if (storyTitle && storyTitleValue) storyTitle.innerHTML = safeRichText(storyTitleValue);
    if (storyText && storyTextValue) storyText.textContent = storyTextValue;
    const footer = $('[data-brand-footer]');
    if (footer && settings.footer_text_ar) footer.textContent = settings.footer_text_ar;
    if (settings.promo_active) {
      const notice = $('.announcement');
      const text = state.locale === 'en' ? settings.promo_text_en || 'A limited-time offer, made for you.' : settings.promo_text_ar || 'عرض خاص لفترة محدودة';
      if (notice) {
        const label = notice.querySelector('span:nth-child(2)');
        if (label) label.textContent = text;
        if (Number(settings.promo_percent) > 0) notice.dataset.promo = `${settings.promo_percent}%`;
      }
    }
  }

  function safeRichText(value) {
    return String(value).replace(/<\/?(br|em|strong)\s*\/?>/gi,tag=>tag.replace(/[^a-z<>/]/gi,'' )).replace(/<(?!\/?(?:br|em|strong)\b)[^>]*>/gi,'');
  }

  async function loadStore() {
    if (!db) {
      const root = $('[data-product-grid]');
      if (root) root.innerHTML = `<div class="loading-card">${escapeHTML(t('إعدادات المتجر غير متاحة.','Store configuration is unavailable.'))}</div>`;
      return;
    }
    const [productsResult,discountResult,brandResult] = await Promise.all([
      db.from('products').select('*').eq('status','published').order('created_at',{ascending:false}),
      db.from('discounts').select('*').eq('active',true),
      page === 'home' ? db.from('brand_settings').select('*').eq('id',true).maybeSingle() : Promise.resolve({data:null})
    ]);
    if (productsResult.error) {
      const root = $('[data-product-grid]');
      if (root) root.innerHTML = `<div class="loading-card">${escapeHTML(t('تعذّر تحميل المجموعة. تحقق من اتصال المتجر.','The collection could not load. Check the store connection.'))}</div>`;
      return;
    }
    state.products = productsResult.data || [];
    state.loaded = true;
    state.discounts = discountResult.error ? [] : (discountResult.data || []);
    applyBrandSettings(brandResult.data);
    renderProducts();
    renderCart();
  }

  function init() {
    setLocale(state.locale);
    $('.language-toggle')?.addEventListener('click',()=>setLocale(state.locale === 'ar' ? 'en' : 'ar'));
    const menu = $('.mobile-menu');
    menu?.addEventListener('click',()=>{
      const nav = $('.main-nav');
      const open = menu.getAttribute('aria-expanded') !== 'true';
      menu.setAttribute('aria-expanded',String(open));
      nav?.classList.toggle('is-open',open);
    });
    $$('.main-nav a').forEach(link=>link.addEventListener('click',()=>{
      menu?.setAttribute('aria-expanded','false');
      $('.main-nav')?.classList.remove('is-open');
    }));
    $('.cart-open')?.addEventListener('click',openCart);
    $('[data-cart-overlay]')?.addEventListener('click',closeCart);
    $('[data-checkout-form]')?.addEventListener('submit',submitOrder);
    $('[data-customize-product]')?.addEventListener('click',event=>openCustomizer(event.currentTarget.dataset.customizeProduct));
    $('[data-open-customizer]')?.addEventListener('click',()=>openCustomizer());
    $('[data-close-custom]')?.addEventListener('click',closeCustomizer);
    $('[data-custom-modal]')?.addEventListener('click',event=>{if(event.target.matches('[data-custom-modal]'))closeCustomizer()});
    $('[data-custom-product]')?.addEventListener('change',event=>{
      state.pickedProduct = state.products.find(product=>product.id===event.target.value) || null;
      syncCustomizerProduct(state.pickedProduct);
    });
    $('[data-custom-size]')?.addEventListener('change',()=>{});
    $('[data-custom-text]')?.addEventListener('input',updatePreviewText);
    $('[data-design-file]')?.addEventListener('change',event=>handleDesignFile(event.target.files?.[0]));
    $('[data-add-custom]')?.addEventListener('click',addCustomizedItem);
    $$('.filter-chip').forEach(button=>button.addEventListener('click',()=>applyProductFilter(button.dataset.filter)));
    $('[data-product-search]')?.addEventListener('input',event=>{state.query=event.target.value;filterAndRenderProducts()});
    const header = $('.site-header');
    window.addEventListener('scroll',()=>header?.classList.toggle('is-scrolled',window.scrollY>12),{passive:true});
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape') { closeCart(); closeCustomizer(); }
    });
    document.addEventListener('click',event=>{
      if (!(event.target instanceof Element)) return;
      const closeButton = event.target.closest('[data-close-cart]');
      if (closeButton) { event.preventDefault(); closeCart(); return; }
      const button = event.target.closest('[data-customize-product]');
      if(button && !button.closest('[data-product-grid]')) openCustomizer(button.dataset.customizeProduct);
    },true);
    $$('.color-swatch').forEach(button=>button.addEventListener('click',()=>chooseColor(button)));
    loadStore();
  }

  init();
})();
