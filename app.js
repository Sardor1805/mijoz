/* ============================================================
   SOZLAMALAR VA SUPABASE
   ============================================================ */
const SUPABASE_URL = "https://iqtdgbkymsilzxdjwpdl.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_5qb3UiLzJT0xzSO8O5V-rQ_2s30obcN";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let _tovarlarKesh = [];
let savat = JSON.parse(localStorage.getItem("savat_kescha")) || [];

// SAHIFALASH O'ZGARUVCHILARI
let joriySahifa = 1;
const sahifadagiSoni = 20;
let qidiruvNatijalari = [];

function formatSum(summa) {
  const n = Number(summa) || 0;
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " so'm";
}

function muvaffaqiyatKorsatish(xabar) { showToast(xabar, "yashil"); }
function xatoKorsatish(xabar) { showToast(xabar, "qizil"); }
function showToast(xabar, tur) {
  const el = document.createElement("div");
  el.className = `toast toast-${tur}`;
  el.textContent = xabar;
  document.getElementById("toast-konteyner").appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/* ============================================================
   SUPABASE MA'LUMOTLARI
   ============================================================ */
async function barchaTovarlar() {
  const { data, error } = await supabaseClient
    .from("tovarlar")
    .select("*, tovar_turlari(nomi)")
    .eq("arxivlangan", false)
    .order("model");
  
  if (error) throw error;
  _tovarlarKesh = data || [];
  return _tovarlarKesh;
}

async function turlarniOlish() {
  const { data, error } = await supabaseClient.from("tovar_turlari").select("*").order("id");
  if (error) throw error;
  return data || [];
}

/* ============================================================
   QIDIRUV VA SAHIFALASH
   ============================================================ */
async function yuklaQidiruv() {
  try {
    const turlar = await turlarniOlish();
    const turSel = document.getElementById("qidiruv-tur");
    turSel.innerHTML = '<option value="Hammasi">Hammasi</option>' +
      turlar.map((t) => `<option value="${t.id}">${t.nomi}</option>`).join("");

    await barchaTovarlar();
    const modelSel = document.getElementById("qidiruv-model");
    const unikalModellar = [...new Set(_tovarlarKesh.map(t => t.model))];
    modelSel.innerHTML = '<option value="Hammasi">Hammasi</option>' +
      unikalModellar.map((m) => `<option value="${m}">${m}</option>`).join("");

    qidiruvIshla();
  } catch (e) {
    xatoKorsatish("Qidiruv yuklashda xato: " + e.message);
  }
}

function qidiruvIshla() {
  const turVal = document.getElementById("qidiruv-tur").value;
  const modelVal = document.getElementById("qidiruv-model").value;
  const matn = document.getElementById("qidiruv-matn").value.toLowerCase().trim();

  let natija = _tovarlarKesh;
  if (turVal !== "Hammasi") natija = natija.filter((t) => String(t.tur_id) === turVal);
  if (modelVal !== "Hammasi") natija = natija.filter((t) => t.model === modelVal);
  if (matn) {
    natija = natija.filter(
      (t) =>
        t.model_kodi.toLowerCase().includes(matn) ||
        t.model.toLowerCase().includes(matn) ||
        (t.marka || "").toLowerCase().includes(matn)
    );
  }

  qidiruvNatijalari = natija;
  joriySahifa = 1; // Har safar qidiruvda 1-sahifadan boshlaymiz
  natijalarniChizish();
  
  mosModellarniQidiruvdaKorsat(natija, matn);
}

// Natijalarni jadvalga va sahifalashga chiqarish
function natijalarniChizish() {
  const tbody = document.getElementById("qidiruv-tbody");
  
  if (!qidiruvNatijalari.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="bosh-qator">Natija topilmadi</td></tr>';
    document.getElementById("pagination").innerHTML = "";
    return;
  }

  // Sahifalash logikasi (20 tadan)
  const boshi = (joriySahifa - 1) * sahifadagiSoni;
  const oxiri = boshi + sahifadagiSoni;
  const joriyTovarlar = qidiruvNatijalari.slice(boshi, oxiri);

  tbody.innerHTML = joriyTovarlar
    .map(
      (t) =>
        `<tr>
          <td data-label="Kod">${t.model_kodi}</td>
          <td data-label="Model">${t.model}</td>
          <td data-label="Marka">${t.marka || "—"}</td>
          <td data-label="Narx">${formatSum(t.narx)}</td>
          <td data-label="Soni">${t.soni} ta</td>
          <td data-label="Amal">
            <button class="btn btn-savat" onclick='savatgaQoshish(${JSON.stringify(t)})'>
              🛒 Qo'shish
            </button>
          </td>
        </tr>`
    )
    .join("");

  // Sahifalash tugmalarini chizish
  sahifalashniChizish();
}

function sahifalashniChizish() {
  const pagEl = document.getElementById("pagination");
  const jamiSahifalar = Math.ceil(qidiruvNatijalari.length / sahifadagiSoni);
  
  if (jamiSahifalar <= 1) {
    pagEl.innerHTML = "";
    return;
  }

  let html = "";
  
  // Orqaga
  if (joriySahifa > 1) {
    html += `<button class="page-btn" onclick="sahifagaOtish(${joriySahifa - 1})">⬅️</button>`;
  }

  // Sahifa raqamlari
  for (let i = 1; i <= jamiSahifalar; i++) {
    html += `<button class="page-btn ${i === joriySahifa ? 'faol' : ''}" onclick="sahifagaOtish(${i})">${i}</button>`;
  }

  // Oldinga
  if (joriySahifa < jamiSahifalar) {
    html += `<button class="page-btn" onclick="sahifagaOtish(${joriySahifa + 1})">➡️</button>`;
  }

  pagEl.innerHTML = html;
}

// Sahifani o'zgartirish funksiyasi
function sahifagaOtish(sahifa) {
  joriySahifa = sahifa;
  natijalarniChizish();
  window.scrollTo({ top: 0, behavior: 'smooth' }); // Tepaga qaytish
}

// Mos modellar
async function mosModellarniQidiruvdaKorsat(tovarlar, matn = "") {
  const tbody = document.getElementById("mos-modellar-tbody");
  if (!tbody) return;

  if (!matn || tovarlar.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="bosh-qator">Mos modellar yo\'q</td></tr>';
    return;
  }

  try {
    const ids = tovarlar.map(t => t.id);
    const { data, error } = await supabaseClient
      .from("mosliklar")
      .select(`
        asosiy_tovar_id,
        mos_tovar_id,
        asosiy:tovarlar!mosliklar_asosiy_tovar_id_fkey(model_kodi, model, marka, narx, soni),
        mos:tovarlar!mosliklar_mos_tovar_id_fkey(model_kodi, model, marka, narx, soni)
      `)
      .or(`asosiy_tovar_id.in.(${ids.join(',')}),mos_tovar_id.in.(${ids.join(',')})`);

    if (error || !data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="bosh-qator">Mos modellar topilmadi</td></tr>';
      return;
    }

    const unikal = new Map();
    data.forEach(r => {
      if (ids.includes(r.asosiy_tovar_id) && r.mos) unikal.set(r.mos.model_kodi, r.mos);
      if (ids.includes(r.mos_tovar_id) && r.asosiy) unikal.set(r.asosiy.model_kodi, r.asosiy);
    });

    let html = "";
    unikal.forEach(t => {
      html += `<tr>
        <td data-label="Kod">${t.model_kodi}</td>
        <td data-label="Model">${t.model}</td>
        <td data-label="Marka">${t.marka || "—"}</td>
        <td data-label="Narx">${formatSum(t.narx)}</td>
        <td data-label="Soni">${t.soni} ta</td>
        <td data-label="Amal">
          <button class="btn btn-savat" onclick='savatgaQoshish(${JSON.stringify(t)})'>
            🛒 Qo'shish
          </button>
        </td>
      </tr>`;
    });
    tbody.innerHTML = html;
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="bosh-qator">Xato: ${e.message}</td></tr>`;
  }
}

/* ============================================================
   SAVATCHA (CART) MANTIQI
   ============================================================ */
function savatgaQoshish(tovar) {
  const mavjud = savat.find(item => item.id === tovar.id);
  if (mavjud) {
    mavjud.soni += 1;
  } else {
    savat.push({
      id: tovar.id,
      model_kodi: tovar.model_kodi,
      model: tovar.model,
      marka: tovar.marka,
      narx: tovar.narx,
      soni: 1
    });
  }
  muvaffaqiyatKorsatish(`${tovar.model} savatga qo'shildi`);
  saqlashSavatKesh();
}

function savatdanOchirish(id) {
  savat = savat.filter(item => item.id !== id);
  saqlashSavatKesh();
}

function savatSoniOzgartirish(id, amal) {
  const item = savat.find(t => t.id === id);
  if (!item) return;
  if (amal === 'plus') item.soni += 1;
  if (amal === 'minus' && item.soni > 1) item.soni -= 1;
  saqlashSavatKesh();
}

function saqlashSavatKesh() {
  localStorage.setItem("savat_kescha", JSON.stringify(savat));
  savatniYangilashUI();
}

function savatniYangilashUI() {
  const tbody = document.getElementById("savat-royxat");
  const jamiSummaEl = document.getElementById("savat-jami");
  const savatSoniEl = document.getElementById("savat-soni");

  if (!tbody || !jamiSummaEl || !savatSoniEl) return;

  let jamiSumma = 0;
  let jamiDona = 0;

  if (savat.length === 0) {
    tbody.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:20px;">Savat bo\'sh</div>';
  } else {
    tbody.innerHTML = savat.map(item => {
      const summa = item.narx * item.soni;
      jamiSumma += summa;
      jamiDona += item.soni;

      return `
        <div class="savat-item">
          <div class="item-info">
            <div class="model">${item.model}</div>
            <div class="kod">${item.model_kodi} | ${formatSum(item.narx)}</div>
          </div>
          <div class="item-amallar">
            <button class="son-btn" onclick="savatSoniOzgartirish(${item.id}, 'minus')">-</button>
            <span style="font-weight:bold; width:20px; text-align:center;">${item.soni}</span>
            <button class="son-btn" onclick="savatSoniOzgartirish(${item.id}, 'plus')">+</button>
            <button onclick="savatdanOchirish(${item.id})" style="background:transparent; border:none; color:#ef4444; cursor:pointer; font-size:16px; margin-left:5px;">🗑️</button>
          </div>
        </div>
      `;
    }).join("");
  }

  savatSoniEl.textContent = jamiDona;
  jamiSummaEl.textContent = formatSum(jamiSumma);
}

/* ============================================================
   PWA VA EVENTLAR
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  // PWA Service Worker ni ro'yxatdan o'tkazish (agar sw.js mavjud bo'lsa)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW xato:', err));
  }

  savatniYangilashUI();
  yuklaQidiruv();

  document.getElementById("qidiruv-tur").addEventListener("change", qidiruvIshla);
  document.getElementById("qidiruv-model").addEventListener("change", qidiruvIshla);
  document.getElementById("qidiruv-matn").addEventListener("input", qidiruvIshla);

  document.getElementById("savat-btn").addEventListener("click", () => {
    savatniYangilashUI();
    document.getElementById("savat-modal").classList.remove("yashirin");
  });
  document.getElementById("savat-yopish").addEventListener("click", () => {
    document.getElementById("savat-modal").classList.add("yashirin");
  });

  document.getElementById("savat-tozalash").addEventListener("click", () => {
    if (savat.length === 0) return;
    if (confirm("Savatdagi barcha tovarlarni o'chirmoqchimisiz?")) {
      savat = [];
      saqlashSavatKesh();
      muvaffaqiyatKorsatish("Savat tozalandi");
    }
  });

  document.getElementById("savat-yakunlash").addEventListener("click", () => {
    if (savat.length === 0) return xatoKorsatish("Savat bo'sh!");
    muvaffaqiyatKorsatish("Sotuv muvaffaqiyatli yakunlandi!");
    savat = [];
    saqlashSavatKesh();
    document.getElementById("savat-modal").classList.add("yashirin");
  });
});