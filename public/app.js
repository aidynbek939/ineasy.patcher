// --- Проверяем, что пользователь авторизован (ID нужен только для этого) ---
const tgId = localStorage.getItem('tg_id');

if (!tgId) {
  window.location.href = '/';
}

// --- Баланс видео (пока хранится локально, реальное списание добавим с логикой обработчика) ---
const balanceLabel = document.getElementById('balanceLabel');

function getBalance() {
  const stored = localStorage.getItem('video_balance');
  return stored === null ? 2 : parseInt(stored, 10); // по умолчанию 2 видео
}

function renderBalance() {
  const n = getBalance();
  balanceLabel.textContent = `${n} видео`;
}
renderBalance();

// --- Пакеты покупки ---
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

const PHONE = '+7 705 542 37 05';

const modalOverlay = document.getElementById('modalOverlay');
const plusBtn = document.getElementById('plusBtn');
const modalClose = document.getElementById('modalClose');
const pkgList = document.getElementById('pkgList');
const packagesView = document.getElementById('packagesView');
const payView = document.getElementById('payView');
const payAmountEl = document.getElementById('payAmount');
const payAmountValueEl = document.getElementById('payAmountValue');
const backToPkgs = document.getElementById('backToPkgs');
const copyPhone = document.getElementById('copyPhone');
const copyAmount = document.getElementById('copyAmount');

function renderPackages() {
  pkgList.innerHTML = '';
  PACKAGES.forEach(pkg => {
    const li = document.createElement('li');
    li.className = 'pkg-row';
    li.innerHTML = `
      <span class="pkg-text">${pkg.count} видео × ${(pkg.price / pkg.count).toFixed(0).replace(/\.0$/, '')} ₸ = <b>${pkg.price.toLocaleString('ru-RU')} ₸</b></span>
      <button class="pkg-buy" data-price="${pkg.price}">Купить</button>
    `;
    pkgList.appendChild(li);
  });
}
renderPackages();

function openModal() {
  modalOverlay.classList.remove('hidden');
  packagesView.classList.remove('hidden');
  payView.classList.add('hidden');
}
function closeModal() {
  modalOverlay.classList.add('hidden');
}

plusBtn.addEventListener('click', openModal);
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

pkgList.addEventListener('click', (e) => {
  const btn = e.target.closest('.pkg-buy');
  if (!btn) return;
  const price = btn.dataset.price;
  payAmountEl.textContent = `${Number(price).toLocaleString('ru-RU')} ₸`;
  payAmountValueEl.textContent = `${Number(price).toLocaleString('ru-RU')} ₸`;
  packagesView.classList.add('hidden');
  payView.classList.remove('hidden');
});

backToPkgs.addEventListener('click', () => {
  payView.classList.add('hidden');
  packagesView.classList.remove('hidden');
});

function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const old = btn.textContent;
    btn.textContent = 'Скопировано';
    setTimeout(() => { btn.textContent = old; }, 1500);
  });
}

copyPhone.addEventListener('click', () => copyText(PHONE.replace(/\s/g, ''), copyPhone));
copyAmount.addEventListener('click', () => copyText(payAmountValueEl.textContent, copyAmount));

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
