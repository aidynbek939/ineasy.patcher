// --- Проверяем, что пользователь авторизован ---
const tgId = localStorage.getItem('tg_id');

if (!tgId) {
  window.location.href = '/';
}

document.getElementById('tgIdLabel').textContent = tgId;

document.getElementById('copyIdBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(tgId).then(() => {
    const btn = document.getElementById('copyIdBtn');
    const old = btn.textContent;
    btn.textContent = '✓';
    setTimeout(() => { btn.textContent = old; }, 1200);
  });
});

// --- Баланс видео (хранится на сервере, привязан к Telegram ID) ---
const balanceLabel = document.getElementById('balanceLabel');

async function loadBalance() {
  try {
    const res = await fetch(`/api/balance/${tgId}`);
    const data = await res.json();
    balanceLabel.textContent = `${data.balance} видео`;
  } catch (e) {
    balanceLabel.textContent = '—';
  }
}
loadBalance();

// --- Пакеты покупки ---
const BOT_USERNAME = 'ineasybot';

const PACKAGES = [
  { count: 3, price: 450 },
  { count: 5, price: 725 },
  { count: 10, price: 1400 },
  { count: 15, price: 2025 },
  { count: 20, price: 2600 },
  { count: 30, price: 3750 },
  { count: 50, price: 6000 },
  { count: 100, price: 11000 },
];

const modalOverlay = document.getElementById('modalOverlay');
const plusBtn = document.getElementById('plusBtn');
const modalClose = document.getElementById('modalClose');
const pkgList = document.getElementById('pkgList');

function renderPackages() {
  pkgList.innerHTML = '';
  PACKAGES.forEach(pkg => {
    const li = document.createElement('li');
    li.className = 'pkg-row';
    const link = `https://t.me/${BOT_USERNAME}?start=buy_${pkg.count}_${pkg.price}`;
    li.innerHTML = `
      <span class="pkg-text">${pkg.count} видео × ${(pkg.price / pkg.count).toFixed(0).replace(/\.0$/, '')} ₸ = <b>${pkg.price.toLocaleString('ru-RU')} ₸</b></span>
      <a class="pkg-buy" href="${link}" target="_blank" rel="noopener">Купить</a>
    `;
    pkgList.appendChild(li);
  });
}
renderPackages();

function openModal() {
  modalOverlay.classList.remove('hidden');
  loadBalance();
}
function closeModal() {
  modalOverlay.classList.add('hidden');
}

plusBtn.addEventListener('click', openModal);
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

// --- Дропзона: всё полностью локально, ничего никуда не отправляется ---
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const previewWrap = document.getElementById('previewWrap');
const previewVideo = document.getElementById('previewVideo');
const fileMeta = document.getElementById('fileMeta');
const clearBtn = document.getElementById('clearBtn');

let currentObjectUrl = null;

function handleFile(file) {
  if (!file || !file.type.startsWith('video/')) return;

  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = URL.createObjectURL(file); // локальный blob, файл никуда не уходит

  previewVideo.src = currentObjectUrl;
  fileMeta.textContent = `${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)} МБ`;
  previewWrap.classList.add('show');

  // TODO: здесь позже подключим саму логику обработки видео
}

dropzone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});

['dragenter', 'dragover'].forEach(evt => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add('drag');
  });
});

['dragleave', 'drop'].forEach(evt => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag');
  });
});

dropzone.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

clearBtn.addEventListener('click', () => {
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  previewVideo.src = '';
  previewWrap.classList.remove('show');
  fileInput.value = '';
});
