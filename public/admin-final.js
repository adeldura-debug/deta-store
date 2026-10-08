const adm = supabase.createClient(DETA_SUPABASE_URL, DETA_SUPABASE_ANON_KEY);
const qa2 = selector => document.querySelector(selector);
const safeA = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const orderStatuses = ['new', 'processing', 'shipped', 'completed', 'cancelled'];

function orderItems(order) {
  if (Array.isArray(order.items)) return order.items;
  if (typeof order.items === 'string') {
    try { const parsed = JSON.parse(order.items); return Array.isArray(parsed) ? parsed : []; }
    catch { return []; }
  }
  return [];
}

function renderOrder(order) {
  const items = orderItems(order);
  const itemRows = items.length ? items.map((item, index) => `
    <li style="margin:8px 0">
      <strong>${safeA(item.name_ar || item.name || item.product_name || `المنتج ${index + 1}`)}</strong>
      · المقاس: ${safeA(item.size || '—')}
      · اللون: ${safeA(item.color || '—')}
      · الكمية: ${safeA(item.quantity ?? 1)}
      · سعر القطعة: ${safeA(item.price ?? 0)} $
    </li>`).join('') : '<li>لا توجد تفاصيل منتجات محفوظة لهذا الطلب.</li>';
  const date = order.created_at ? new Date(order.created_at).toLocaleString('ar-SY') : '—';
  const statuses = [...new Set([order.status, ...orderStatuses].filter(Boolean))];
  return `<article class="order-card" style="display:block;padding:18px 0;border-top:1px solid #e2e6e8;line-height:1.9">
    <strong>رقم الطلب: ${safeA(order.id)}</strong> · <small>${safeA(date)}</small><br>
    العميل: ${safeA(order.customer_name || '—')}<br>
    الهاتف: ${safeA(order.customer_phone || '—')}<br>
    ${order.customer_email ? `البريد الإلكتروني: ${safeA(order.customer_email)}<br>` : ''}
    العنوان: ${safeA(order.customer_address || '—')}<br>
    المنتجات:
    <ul style="margin:4px 0;padding-right:22px">${itemRows}</ul>
    ${order.discount ? `الخصم: ${safeA(order.discount)} $${order.coupon_code ? ` · القسيمة: ${safeA(order.coupon_code)}` : ''}<br>` : ''}
    الإجمالي: <strong>${safeA(order.total ?? 0)} $</strong><br>
    الحالة: <select data-order-id="${safeA(order.id)}">${statuses.map(status => `<option value="${safeA(status)}" ${status === order.status ? 'selected' : ''}>${safeA(status)}</option>`).join('')}</select>
  </article>`;
}

async function loadAdminFinal() {
  const [products, orders, prints] = await Promise.all([
    adm.from('products').select('*').order('created_at', { ascending: false }),
    adm.from('orders').select('*').order('created_at', { ascending: false }),
    adm.from('custom_print_orders').select('*').order('created_at', { ascending: false })
  ]);
  if (products.error || orders.error || prints.error) {
    const error = products.error || orders.error || prints.error;
    qa2('#orders').innerHTML = `<div class="row">${safeA(error.message)}</div>`;
    return;
  }
  qa2('#products').innerHTML = (products.data || []).map(product => `
    <div class="row"><span>${safeA(product.name_ar)} · ${safeA(product.price)} $ · المخزون ${safeA(product.stock)}</span>
      <button class="danger" data-delete-product="${safeA(product.id)}">حذف</button>
    </div>`).join('') || 'لا توجد منتجات';
  qa2('#orders').innerHTML = (orders.data || []).map(renderOrder).join('') || 'لا توجد طلبات';
  qa2('#prints').innerHTML = (prints.data || []).map(print => `
    <article class="row" style="display:block;padding:18px 0;line-height:1.9;border-top:1px solid #e2e6e8">
      <strong>العميل:</strong> ${safeA(print.customer_name)}<br>
      <strong>الهاتف:</strong> ${safeA(print.customer_phone)}<br>
      ${print.customer_email ? `<strong>البريد:</strong> ${safeA(print.customer_email)}<br>` : ''}
      <strong>القطعة:</strong> ${safeA(print.garment_type)} · <strong>المقاس:</strong> ${safeA(print.size)} · <strong>اللون:</strong> ${safeA(print.color)}<br>
      <strong>الكمية:</strong> ${safeA(print.quantity)}<br>
      <strong>الوصف:</strong> ${safeA(print.description)}<br>
      <strong>الحالة:</strong> ${safeA(print.status)}
    </article>`).join('') || 'لا توجد طلبات طباعة';
}

window.setO = async (id, status) => {
  const result = await adm.from('orders').update({ status }).eq('id', id);
  if (result.error) alert(result.error.message);
};

qa2('#products').addEventListener('click', async event => {
  const button = event.target.closest('[data-delete-product]');
  if (!button || !confirm('حذف المنتج؟')) return;
  const result = await adm.from('products').delete().eq('id', button.dataset.deleteProduct);
  if (result.error) alert(result.error.message);
  else loadAdminFinal();
});

qa2('#orders').addEventListener('change', event => {
  const select = event.target.closest('select[data-order-id]');
  if (select) window.setO(select.dataset.orderId, select.value);
});

qa2('#loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = Object.fromEntries(new FormData(event.target));
  const result = await adm.auth.signInWithPassword({ email: form.email, password: form.password });
  if (result.error) qa2('#loginMsg').textContent = result.error.message;
  else {
    qa2('#login').hidden = true;
    qa2('#app').hidden = false;
    loadAdminFinal();
  }
});

qa2('#logout').addEventListener('click', async () => {
  await adm.auth.signOut();
  location.reload();
});

adm.auth.getSession().then(({ data }) => {
  if (!data.session) return;
  qa2('#login').hidden = true;
  qa2('#app').hidden = false;
  loadAdminFinal();
});