(() => {
  'use strict';

  // Initialize Supabase client
  const db = window.supabase.createClient(
    window.DETA_SUPABASE_URL,
    window.DETA_SUPABASE_ANON_KEY
  );

  // DOM Elements
  const $ = selector => document.querySelector(selector);
  const $$ = selector => document.querySelectorAll(selector);

  // --- State ---
  let currentUser = null;
  let products = [];
  let orders = [];
  let prints = [];
  let editProductId = null;

  // --- Utility Functions ---
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '"',
    "'": '''
  }[char]));

  const showToast = (message, isError = false) => {
    const container = $('#toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.color = isError ? '#f87171' : '#10b981';
    container.appendChild(toast);
    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  const setMessage = (selector, message, isError = false) => {
    const element = $(selector);
    if (!element) return;
    element.textContent = message || '';
    element.classList.toggle('is-error', isError);
  };

  // --- Authentication ---
  const handleLogin = async (email, password) => {
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage('#loginError', error.message, true);
      showToast('بيانات الدخول غير صحيحة', true);
      return false;
    }
    currentUser = data.session.user;
    localStorage.setItem('deta_admin_session', JSON.stringify(data.session));
    return true;
  };

  const handleLogout = async () => {
    await db.auth.signOut();
    currentUser = null;
    localStorage.removeItem('deta_admin_session');
    $('#loginScreen').hidden = false;
    $('#app').hidden = true;
    showToast('تم تسجيل الخروج');
  };

  // --- Check Session ---
  const initApp = async () => {
    const savedSession = localStorage.getItem('deta_admin_session');
    if (savedSession) {
      const { data, error } = await db.auth.getSession();
      if (error) return;
      currentUser = data.session?.user;
    }

    if (currentUser) {
      $('#loginScreen').hidden = true;
      $('#app').hidden = false;
      await loadDashboard();
    } else {
      $('#loginScreen').hidden = false;
      $('#app').hidden = true;
    }
  };

  // --- Load Dashboard ---
  const loadDashboard = async () => {
    try {
      const [p, o, c] = await Promise.all([
        db.from('products').select('*').order('created_at', { ascending: false }),
        db.from('orders').select('*').order('created_at', { ascending: false }),
        db.from('custom_print_orders').select('*').order('created_at', { ascending: false })
      ]);

      if (p.error || o.error || c.error) throw new Error('فشل في تحميل البيانات');

      products = p.data || [];
      orders = o.data || [];
      prints = c.data || [];

      // Update stats
      $('#countProducts').textContent = products.length;
      $('#countOrders').textContent = orders.length;
      $('#countPrints').textContent = prints.length;

      // Update stats mini
      $('#statsMini').innerHTML = `
        <div class="stat-item">قطع: <strong>${products.length}</strong></div>
        <div class="stat-item">طلبات: <strong>${orders.length}</div>
        <div class="stat-item">تصاميم: <strong>${prints.length}</div>
      `;

      renderProducts();
      renderOrders();
      renderPrints();
      updateStorageInfo();
    } catch (err) {
      console.error(err);
      showToast('خطأ في تحميل البيانات', true);
    }
  };

  // --- Products ---
  const renderProducts = () => {
    const container = $('#productsList');
    if (!products.length) {
      container.innerHTML = `<div class="empty-state">لا توجد منتجات بعد. أضف أول منتج.</div>`;
      return;
    }

    container.innerHTML = products.map(product => {
      const firstImage = product.images && product.images[0] ? product.images[0] : '';
      return `
        <article class="glass-card product-item" style="border-left: 4px solid #e2e8f0;">
          <div class="product-header">
            <span class="product-status status-${product.status || 'draft'}">${product.status || 'draft'}</span>
            <span class="product-sku">${product.id ? product.id.slice(0, 8) : '—'}</span>
          </div>
          <div class="product-image-wrapper">
            <img src="${firstImage ? (firstImage.startsWith('http') ? firstImage : `${window.DETA_SUPABASE_URL}/storage/v1/object/public/product-images/${firstImage.split('/').pop()}`) : '/placeholder.svg?height=120&width=160'}" 
                 alt="${product.name_ar || product.name_en || 'منتج'}" 
                 class="product-image"
                 style="width:100%;height:120px;object-fit:cover;border-radius:8px;">
          </div>
          <div class="product-info">
            <h3 class="product-name">${escapeHTML(product.name_ar || product.name_en)}</h3>
            <p class="product-sku">${product.category || '—'}</p>
            <div class="product-actions">
              <button class="btn btn-sm btn-edit" data-id="${product.id}" title="تعديل">✏️</button>
              <button class="btn btn-sm btn-delete" data-id="${product.id}" title="حذف">🗑️</button>
            </div>
          </div>
          <div class="product-stock">
            <span>المخزون: ${product.stock ?? 0}</span>
            <span class="stock-qty">${product.stock && product.stock > 0 ? 'متاح' : 'نفد'}</span>
          </div>
        </article>
      `;
    }).join('') || '<div class="empty-state">لا توجد منتجات بعد.</div>';
  };

  const openProductModal = (product = null) => {
    editProductId = product ? product.id : null;
    const modalTitle = document.getElementById('modalTitle');
    const submitBtn = document.getElementById('submitBtn');
    const productId = document.getElementById('productId');
    const currentImage = document.getElementById('currentImage');
    const product = products.find(p => p.id === editProductId);

    if (product) {
      modalTitle.textContent = 'تعديل منتج';
      submitBtn.textContent = 'تحديث';
      productId.value = product.id;
      currentImage.value = product.images ? product.images[0] || '' : '';
      $('#nameAr').value = product.name_ar || '';
      $('#nameEn').value = product.name_en || '';
      $('#category').value = product.category || 'hoodie';
      $('#status').value = product.status || 'draft';
      $('#price').value = product.price || 0;
      $('#oldPrice').value = product.old_price || '';
      $('#stock').value = product.stock ?? 0;
      $('#sizes').value = product.sizes ? product.sizes.join(', ') : '';
      $('#colors').value = product.colors ? product.colors.join(', ') : '';
      $('#descAr').value = product.description_ar || '';
      $('#descEn').value = product.description_en || '';
    } else {
      modalTitle.textContent = 'منتج جديد';
      submitBtn.textContent = 'حفظ';
      productId.value = '';
      currentImage.value = '';
      $('#productForm').reset();
    }

    $('#productModal').showModal();
  };

  const closeProductModal = () => {
    $('#productModal').close();
    editProductId = null;
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    
    const formData = {
      name_ar: $('#nameAr').value.trim(),
      name_en: $('#nameEn').value.trim(),
      description_ar: $('#descAr').value.trim(),
      description_en: $('#descEn').value.trim(),
      price: Number($('#price').value) || 0,
      old_price: $('#oldPrice').value ? Number($('#oldPrice').value) : null,
      stock: Number($('#stock').value) || 0,
      category: $('#category').value || 'hoodie',
      status: $('#status').value || 'draft',
      sizes: $('#sizes').value.split(',').map(s => s.trim()).filter(s => s.length) || [],
      colors: $('#colors').value.split(',').map(c => c.trim()).filter(c => c.length) || [],
      images: []
    };

    // Handle image upload
    const imageFile = $('#productImage').files?.[0];
    if (imageFile) {
      const extension = imageFile.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'webp';
      const path = `products/${Date.now()}.${extension}`;
      
      const { error: uploadError } = await db.storage
        .from('product-images')
        .upload(path, imageFile, { contentType: imageFile.type });

      if (uploadError) {
        showToast('فشل في رفع الصورة: ' + uploadError.message, true);
        return;
      }

      const { data: urlData } = db.storage
        .from('product-images')
        .getPublicUrl(path);

      formData.images = [urlData.data.publicUrl];
    } else if (editProductId) {
      // Keep existing image
      const existingProduct = products.find(p => p.id === editProductId);
      formData.images = existingProduct ? [existingProduct.images[0] || ''] : [];
    }

    try {
      let result;
      if (editProductId) {
        result = await db.from('products')
          .update(formData)
          .eq('id', editProductId);
      } else {
        result = await db.from('products').insert(formData);
      }

      if (result.error) throw result.error;

      showToast(editProductId ? 'تم تحديث المنتج بنجاح' : 'تم إضافة المنتج بنجاح');
      closeProductModal();
      await loadDashboard();
    } catch (err) {
      showToast('حدث خطأ: ' + err.message, true);
    }
  };

  const deleteProduct = async (productId) => {
    if (!confirm('هل متأكد تريد حذف هذا المنتج؟')) return;
    
    const { error } = await db.from('products').delete().eq('id', productId);
    if (error) {
      showToast('فشل في الحذف: ' + error.message, true);
      return;
    }
    showToast('تم حذف المنتج بنجاح');
    await loadDashboard();
  };

  const deleteAllProducts = async () => {
    if (!confirm('تحذير: سيتم حذف كل المنتجات من الكتالوج. هل متأكد؟')) return;
    
    try {
      const { error } = await db.from('products').delete().gt('id', 0);
      if (error) throw error;
      showToast('تم حذف كل المنتجات');
      await loadDashboard();
    } catch (err) {
      showToast('حدث خطأ أثناء الحذف', true);
    }
  };

  // --- Orders ---
  const renderOrders = () => {
    const container = $('#ordersList');
    if (!orders.length) {
      container.innerHTML = `<div class="empty-state">لا توجد طلبات حتى الآن.</div>`;
      return;
    }

    container.innerHTML = orders.map(order => {
      const items = order.items || [];
      const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const status = order.status || 'new';

      // Get customer name
      const customerName = order.customer_name || 'عميل';

      // Format date
      const date = order.created_at ? new Date(order.created_at).toLocaleDateString('ar-SY') : '—';

      // Build items HTML
      const itemsHTML = items.map((item, idx) => {
        // Find product image
        const product = products.find(p => p.id === item.product);
        const productImage = product && product.images && product.images[0]
          ? product.images[0]
          : '';

        const imageURL = productImage && productImage.startsWith('http')
          ? productImage
          : (productImage ? `${window.DETA_SUPABASE_URL}/storage/v1/object/public/product-images/${productImage.split('/').pop()}` : '');

        return `
          <div class="order-item-product">
            ${imageURL ? `<img src="${imageURL}" alt="${escapeHTML(item.name || '')}" style="width:40px;height:40px;border-radius:6px;">` : 'D.'}
            <div>
              <strong>${escapeHTML(item.name || `قطعة ${idx + 1}`)}</strong>
              <span>${item.size ? 'م: ' + item.size : ''}</span>
              ${item.color ? '<br><span>ل: ' + item.color + '</span>' : ''}
            </div>
          </div>
        `;
      }).join('') || '<span class="empty">لا تفاصيل</span>';

      return `
        <article class="order-item">
          <div class="order-header">
            <div>
              <span class="order-customer">${escapeHTML(customerName)}</span>
              <span class="order-id">#${order.id ? order.id.slice(0, 8) : '—'}</span>
            </div>
            <span class="order-date">${date}</span>
          </div>
          <div class="order-details">
            ${itemsHTML}
          </div>
          <div class="order-total">
            الإجمالي: <strong>${total.toFixed(2)} $</strong>
          </div>
          <span class="order-status status-${status}" style="color: ${status === 'completed' ? '#10b981' : status === 'cancelled' ? '#ef4444' : '#f59e0b'}">
            ${status}
          </span>
          <div class="order-actions">
            <button class="btn btn-sm btn-view-order" data-id="${order.id}" title="عرض التفاصيل">👁️</button>
          </div>
        </article>
      `;
    }).join('') || '<div class="empty-state">لا توجد طلبات.</div>';
  };

  const openOrderDetail = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const items = order.items || [];
    
    let itemsHTML = '';
    items.forEach((item, idx) => {
      const product = products.find(p => p.id === item.product);
      const productImage = product && product.images && product.images[0]
        ? product.images[0]
        : '';

      const imageURL = productImage && productImage.startsWith('http')
        ? productImage
        : (productImage ? `${window.DETA_SUPABASE_URL}/storage/v1/object/public/product-images/${productImage.split('/').pop()}` : '');

      itemsHTML += `
        <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05);">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            ${imageURL ? `<img src="${imageURL}" alt="${escapeHTML(item.name || '')}" style="width:50px;height:50px;border-radius:8px;object-fit:cover;">` : '<div style="width:50px;height:50px;background: #333; border-radius:8px;"></div>'}
            <div>
              <strong>${escapeHTML(item.name || `قطعة ${idx + 1}`)}</strong>
              <span>${item.size ? 'م: ' + item.size : ''}</span>
              ${item.color ? '<br><span>ل: ' + item.color + '</span>' : ''}
            </div>
          </div>
          <div style="font-size: 12px; color: #64748b;">
            الكمية: ${item.quantity ?? 1} • السعر: ${(item.price || 0).toFixed(2)} $
          </div>
        </div>
      `;
    });

    $('#orderModalTitle').textContent = `طلب #${order.id ? order.id.slice(0, 8) : '—'}`;
    $('#orderDetail').innerHTML = `
      <div class="order-customer">${escapeHTML(order.customer_name || 'عميل')}</div>
      <div style="font-size: 13px; color: #64748b; margin-bottom: 12px;">${escapeHTML(order.customer_email || '')}${order.customer_phone ? ' • ' + escapeHTML(order.customer_phone) : ''}</div>
      ${itemsHTML}
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.05);">
        <div style="font-weight: 600; color: #f1f5f9;">الإجمالي: ${(order.total || 0).toFixed(2)} $</div>
        <div style="font-size: 12px; color: #64748b;">الخصم: ${(order.discount || 0).toFixed(2)} $</div>
      </div>
    `;

    $('#orderModal').showModal();
  };

  // --- Prints ---
  const renderPrints = () => {
    const container = $('#printsList');
    if (!prints.length) {
      container.innerHTML = `<div class="empty-state">لا توجد طلبات Design.</div>`;
      return;
    }

    container.innerHTML = prints.map(print => {
      const designImage = print.design_image && !print.design_image.startsWith('http')
        ? `${window.DETA_SUPABASE_URL}/storage/v1/object/public/print-designs/${print.design_image}`
        : (print.design_image || '');

      return `
        <article class="glass-card print-item" style="border-left: 4px solid #10b981;">
          <div class="product-header">
            <span class="product-status status-${print.status || 'new'}">${print.status || 'new'}</span>
          </div>
          <div class="product-image-wrapper">
            ${designImage ? `<img src="${designImage}" alt="تصميم ${print.customer_name || 'تصميم'}" class="product-image" style="width:100%;height:120px;object-fit:cover;border-radius:8px;">` : '<div style="height:120px;background: #333;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#64748b;">لا صورة</div>'} 
          </div>
          <div class="product-info">
            <h3 class="product-name">${escapeHTML(print.customer_name || 'عميل')}</h3>
            <p class="product-sku">قطعة: ${escapeHTML(print.garment_type || '—')}</p>
            <p class="product-sku">مقاس: ${escapeHTML(print.size || '—')} • لون: ${escapeHTML(print.color || '—')}</p>
          </div>
        </article>
      `;
    }).join('') || '<div class="empty-state">لا توجد طلبات Design.</div>';
  };

  // --- Settings ---
  const updateStorageInfo = async () => {
    try {
      // Get bucket info from Supabase
      const { data: buckets } = await db.storage.list('product-images');
      const total = buckets ? buckets.length * 0.5 : 0; // Estimate
      $('#storageUsed').textContent = '~' + Math.round(total) + ' MB';
      $('#storageTotal').textContent = '2 GB';
    } catch (e) {
      $('#storageUsed').textContent = '—';
      $('#storageTotal').textContent = '—';
    }
  };

  const syncProducts = async () => {
    try {
      const { data, error } = await db.from('products').select('*');
      if (error) throw error;
      showToast('تم مزامنة ' + (data?.length || 0) + ' منتج');
      await loadDashboard();
    } catch (err) {
      showToast('فشل في المزامنة', true);
    }
  };

  // --- Event Listeners ---
  
  // Login/Logout
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#email').value.trim();
    const password = $('#password').value.trim();
    const success = await handleLogin(email, password);
    if (success) initApp();
  });

  $('#logoutBtn').addEventListener('click', handleLogout);

  // --- Product Modal ---
  $('#productModal').addEventListener('click', (e) => {
    if (e.target === $('#productModal')) closeProductModal();
    if (e.target.classList.contains('modal-close')) closeProductModal();
  });

  $('#productForm').addEventListener('submit', handleProductSubmit);

  // --- Product Buttons ---
  $('#productsList').addEventListener('click', (e) => {
    const editBtn = e.target.closest('.btn-edit');
    const deleteBtn = e.target.closest('.btn-delete');

    if (editBtn) {
      const productId = editBtn.dataset.id;
      const product = products.find(p => p.id === productId);
      if (product) openProductModal(product);
    }

    if (deleteBtn) {
      const productId = deleteBtn.dataset.id;
      deleteProduct(productId);
    }
  });

  // --- Delete All Products
  $('#btnDeleteAllProducts').addEventListener('click', deleteAllProducts);

  // --- Order Buttons
  $('#ordersList').addEventListener('click', (e) => {
    const viewBtn = e.target.closest('.btn-view-order');
    if (viewBtn) {
      const orderId = viewBtn.dataset.id;
      openOrderDetail(orderId);
    }
  });

  $('#orderModal').addEventListener('click', (e) => {
    if (e.target === $('#orderModal')) $('#orderModal').close();
    if (e.target.classList.contains('modal-close')) $('#orderModal').close();
  });

  // --- Tab Switching
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active tab
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Hide all panels
      $$('.tab-panel').forEach(p => p.setAttribute('aria-hidden', 'true'));
      $$('.tab-panel').forEach(p => p.classList.remove('active'));

      // Show selected panel
      const tabId = btn.dataset.tab;
      const panel = $(('#panel' + tabId.charAt(0).toUpperCase() + tabId.slice(1)));
      if (panel) {
        panel.setAttribute('aria-hidden', 'false');
        panel.classList.add('active');
      }
    });
  });

  // --- Settings Form
  $('#settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      // Save settings to Supabase brand_settings
      const { error } = await db.from('brand_settings')
        .upsert({
          hero_title_ar: $('#storeNameAr').value,
          hero_title_en: $('#storeNameEn').value,
          hero_text_ar: $('#storeDescAr').value,
          hero_text_en: $('#storeDescEn').value,
        });
      
      if (error) throw error;
      showToast('تم حفظ الإعدادات');
    } catch (err) {
      showToast('خطأ في الحفظ', true);
    }
  });

  // --- Initialize ---
  initApp();
})();