(() => {
  'use strict';
  const db = window.supabase.createClient(window.DETA_SUPABASE_URL, window.DETA_SUPABASE_ANON_KEY);
  const $ = selector => document.querySelector(selector);
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money = value => `${Number(value || 0).toFixed(2)} $`;
  const statuses = {new:'جديد',processing:'قيد التجهيز',shipped:'تم الشحن',completed:'مكتمل',cancelled:'ملغي'};
  let products = [];

  function setMessage(selector, message, isError = false) {
    const element = $(selector);
    if (!element) return;
    element.textContent = message || '';
    element.classList.toggle('is-error',isError);
  }

  function setLoggedIn(session) {
    $('#login').hidden = !!session;
    $('#app').hidden = !session;
    if (session) loadDashboard();
  }

  async function loadDashboard() {
    const [p,o,c] = await Promise.all([
      db.from('products').select('*').order('created_at',{ascending:false}),
      db.from('orders').select('*').order('created_at',{ascending:false}),
      db.from('custom_print_orders').select('*').order('created_at',{ascending:false})
    ]);
    const error = p.error || o.error || c.error;
    if (error) {
      setMessage('#loginMsg',error.message,true);
      return;
    }
    products = p.data || [];
    renderProducts(products);
    renderOrders(o.data || []);
    const printRows = await Promise.all((c.data || []).map(async print => {
      if (!print.design_image || /^https?:\/\//i.test(print.design_image) || /^data:image\//i.test(print.design_image)) return print;
      const signed = await db.storage.from('print-designs').createSignedUrl(print.design_image,3600);
      return {...print,design_url:signed.data?.signedUrl || ''};
    }));
    renderPrints(printRows);
    $('[data-admin-count-products]').textContent = String(products.length).padStart(2,'0');
    $('[data-admin-count-orders]').textContent = String((o.data || []).length).padStart(2,'0');
    $('[data-admin-count-prints]').textContent = String((c.data || []).length).padStart(2,'0');
  }

  function productImage(product) {
    const image = Array.isArray(product.images) ? product.images[0] : '';
    return typeof image === 'string' && (/^https:\/\//i.test(image) || image.startsWith('/')) ? image : '';
  }

  function renderProducts(list) {
    const root = $('#products');
    root.innerHTML = list.map(product => {
      const image = productImage(product);
      return `<article class="admin-record"><div class="admin-record-thumb">${image ? `<img src="${escapeHTML(image)}" alt="">` : 'D.'}</div><div><h3>${escapeHTML(product.name_ar || product.name_en || 'DETA')}</h3><p>${escapeHTML(product.name_en || '')}${product.category ? ` · ${escapeHTML(product.category)}` : ''}${Array.isArray(product.sizes) && product.sizes.length ? ` · ${escapeHTML(product.sizes.join(', '))}` : ''}</p></div><div class="admin-record-side"><strong>${money(product.price)}</strong><span>${escapeHTML(product.stock ?? 0)} متاح</span><button type="button" data-delete-product="${escapeHTML(product.id)}">حذف</button></div></article>`;
    }).join('') || '<p class="admin-empty">لا توجد قطع بعد. أضف أول قطعة للمتجر.</p>';
  }

  function orderItems(order) {
    if (Array.isArray(order.items)) return order.items;
    if (typeof order.items === 'string') {
      try { const parsed = JSON.parse(order.items); return Array.isArray(parsed) ? parsed : []; }
      catch { return []; }
    }
    return [];
  }

  function imagePreview(value, className = 'admin-order-item-image') {
    const safe = typeof value === 'string' && (/^https:\/\//i.test(value) || /^data:image\/(?:png|jpeg|webp);base64,/i.test(value));
    return safe ? `<img class="${className}" src="${escapeHTML(value)}" alt="معاينة التصميم" loading="lazy">` : '';
  }

  function renderOrders(orders) {
    $('#orders').innerHTML = orders.map(order => {
      const items = orderItems(order).map((item,index) => {
        const custom = item.customization || {};
        const details = [
          item.kind && ({hoodie:'هودي',tee:'كنزة نص كم',mug:'كوب'}[item.kind] || item.kind),
          item.size && `المقاس: ${item.size}`,
          item.color && `اللون: ${item.color}${item.color_hex ? ` (${item.color_hex})` : ''}`,
          `الكمية: ${item.quantity ?? 1}`,
          `سعر القطعة: ${money(item.price)}`,
          Number(item.discount || 0) > 0 && `خصم القطعة: ${money(item.discount)}`,
          custom.text && `النص المخصص: “${custom.text}”`,
          custom.fileName && `ملف التصميم: ${custom.fileName}`
        ].filter(Boolean).join(' · ');
        const design = imagePreview(item.design_image,'admin-order-item-design');
        return `<li class="admin-order-item"><div class="admin-record-thumb">${imagePreview(item.design_image,'') || 'D.'}</div><div><strong class="admin-order-item-name">${escapeHTML(item.name_ar || item.name || item.name_en || `قطعة ${index+1}`)}</strong><div class="admin-order-item-details">${escapeHTML(details)}</div>${design ? `<a href="${escapeHTML(item.design_image)}" download="deta-design-${index+1}.webp" aria-label="تنزيل التصميم">${design}</a>` : ''}</div></li>`;
      }).join('') || '<li class="admin-empty">لا توجد تفاصيل محفوظة لهذا الطلب.</li>';
      const date = order.created_at ? new Date(order.created_at).toLocaleString('ar-SY') : '—';
      const currentStatus = order.status || 'new';
      const statusOptions = [...new Set([currentStatus,...Object.keys(statuses)])].map(status => `<option value="${escapeHTML(status)}" ${status===currentStatus?'selected':''}>${escapeHTML(statuses[status] || status)}</option>`).join('');
      return `<article class="admin-order"><div class="admin-order-head"><div><h3>${escapeHTML(order.customer_name || 'عميل DETA')}</h3><p>${escapeHTML(date)} · ${escapeHTML(String(order.id || '').slice(0,8).toUpperCase())}</p></div><span>${escapeHTML(statuses[currentStatus] || currentStatus)}</span></div><div class="admin-order-contact"><span>الهاتف: ${escapeHTML(order.customer_phone || '—')}</span>${order.customer_email ? `<span>البريد: ${escapeHTML(order.customer_email)}</span>` : ''}<span>العنوان: ${escapeHTML(order.customer_address || '—')}</span></div><ul class="admin-order-items">${items}</ul><div class="admin-order-foot"><span>${Number(order.discount || 0)>0 ? `الخصم: − ${money(order.discount)} · ` : ''}الإجمالي <strong>${money(order.total)}</strong></span><label>الحالة <select class="status-select" data-order-status="${escapeHTML(order.id)}">${statusOptions}</select></label></div></article>`;
    }).join('') || '<p class="admin-empty">لا توجد طلبات حتى الآن.</p>';
  }

  function renderPrints(prints) {
    $('#prints').innerHTML = prints.map(print => {
      const image = imagePreview(print.design_url || print.design_image,'admin-order-item-design');
      return `<article class="admin-order"><div class="admin-order-head"><div><h3>${escapeHTML(print.customer_name || 'عميل DETA')}</h3><p>${escapeHTML(print.customer_phone || '—')}${print.customer_email ? ` · ${escapeHTML(print.customer_email)}` : ''}</p></div><span>${escapeHTML(print.status || 'new')}</span></div><div class="admin-order-contact"><span>القطعة: ${escapeHTML(print.garment_type || '—')}</span><span>المقاس: ${escapeHTML(print.size || '—')}</span><span>اللون: ${escapeHTML(print.color || '—')}</span><span>الكمية: ${escapeHTML(print.quantity || 1)}</span></div><p class="admin-order-item-details">${escapeHTML(print.description || '')}</p>${image ? `<a href="${escapeHTML(print.design_image)}" download="deta-print-design.webp">${image}</a>` : ''}</article>`;
    }).join('') || '<p class="admin-empty">لا توجد طلبات تصميم خاص.</p>';
  }

  $('#image').addEventListener('change',event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 5*1024*1024) {
      event.target.value = '';
      setMessage('#msg','اختر صورة PNG أو JPG أو WEBP بحجم لا يتجاوز 5MB.',true);
      return;
    }
    const preview = $('#preview');
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
  });

  $('#loginForm').addEventListener('submit',async event => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const {data,error} = await db.auth.signInWithPassword({email:form.email,password:form.password});
    if (error) { setMessage('#loginMsg',error.message,true); return; }
    setLoggedIn(data.session);
  });

  $('#logout').addEventListener('click',async () => { await db.auth.signOut(); location.reload(); });

  $('#productForm').addEventListener('submit',async event => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
      const formElement = event.currentTarget;
      const file = $('#image').files?.[0];
    if (!file) { setMessage('#msg','أضف صورة للقطعة أولًا.',true); return; }
    const extension = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g,'') || 'webp';
    const path = `${crypto.randomUUID()}.${extension}`;
    setMessage('#msg','جارٍ رفع القطعة والصورة…');
    const upload = await db.storage.from('product-images').upload(path,file,{contentType:file.type,upsert:false});
    if (upload.error) { setMessage('#msg',upload.error.message,true); return; }
    const image = db.storage.from('product-images').getPublicUrl(path).data.publicUrl;
    const row = {name_ar:form.name_ar,name_en:form.name_en,description_ar:form.description_ar,description_en:form.description_en,price:Number(form.price),old_price:Number(form.old_price)||null,stock:Number(form.stock),category:form.category,sizes:String(form.sizes||'').split(',').map(value=>value.trim()).filter(Boolean),colors:String(form.colors||'').split(',').map(value=>value.trim()).filter(Boolean),images:[image],status:form.status};
    const {error} = await db.from('products').insert(row);
    if (error) { setMessage('#msg',`رُفعت الصورة، لكن تعذّر حفظ القطعة: ${error.message}`,true); return; }
    formElement.reset();
    $('#preview').removeAttribute('src');
    $('#preview').style.display = 'none';
    setMessage('#msg','أصبحت القطعة في مجموعة DETA.');
    await loadDashboard();
  });

  $('#products').addEventListener('click',async event => {
    const button = event.target.closest('[data-delete-product]');
    if (!button || !confirm('حذف هذه القطعة من كتالوج DETA؟')) return;
    const {error} = await db.from('products').delete().eq('id',button.dataset.deleteProduct);
    if (error) { setMessage('#msg',error.message,true); return; }
    await loadDashboard();
  });

  $('#orders').addEventListener('change',async event => {
    const select = event.target.closest('[data-order-status]');
    if (!select) return;
    select.disabled = true;
    const {error} = await db.from('orders').update({status:select.value}).eq('id',select.dataset.orderStatus);
    if (error) { setMessage('#loginMsg',error.message,true); await loadDashboard(); }
    select.disabled = false;
  });

  $('#loginForm').addEventListener('input',()=>setMessage('#loginMsg',''));
  $('#msg')?.addEventListener('click',()=>setMessage('#msg',''));
  db.auth.getSession().then(({data})=>setLoggedIn(data.session));
})();
