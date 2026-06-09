const el = {
  versionBadge: document.getElementById("versionBadge"),
  statusDot: document.getElementById("statusDot"),
  statusLabel: document.getElementById("statusLabel"),
  statusDetail: document.getElementById("statusDetail"),
  progressWrap: document.getElementById("progressWrap"),
  progressBar: document.getElementById("progressBar"),
  checkBtn: document.getElementById("checkBtn"),
  installBtn: document.getElementById("installBtn"),
  metaVersion: document.getElementById("metaVersion"),
  metaPlatform: document.getElementById("metaPlatform"),
  metaArch: document.getElementById("metaArch"),
  metaElectron: document.getElementById("metaElectron"),
  metaNode: document.getElementById("metaNode"),
  metaChrome: document.getElementById("metaChrome"),
};

const STATUS_LABELS = {
  idle: "Aguardando verificação…",
  checking: "Verificando atualizações no GitHub Releases…",
  available: "Nova versão disponível, iniciando download…",
  downloading: "Baixando atualização…",
  downloaded: "Atualização baixada. Pronta para instalar.",
  none: "Você está na versão mais recente.",
  error: "Erro ao verificar atualizações.",
};

const PLATFORM_LABELS = {
  darwin: "macOS",
  win32: "Windows",
  linux: "Linux",
};

function setStatus(status, label, detail) {
  el.statusDot.dataset.status = status;
  el.statusLabel.textContent = label || STATUS_LABELS[status] || status;
  el.statusDetail.textContent = detail || "";
  el.progressWrap.hidden = status !== "downloading";
  if (status !== "downloading") el.progressBar.style.width = "0%";
  el.installBtn.hidden = status !== "downloaded";
}

async function loadInfo() {
  const info = await window.updater.getInfo();
  el.versionBadge.textContent = `v${info.version}`;
  el.metaVersion.textContent = info.version;
  el.metaPlatform.textContent = PLATFORM_LABELS[info.platform] || info.platform;
  el.metaArch.textContent = info.arch;
  el.metaElectron.textContent = info.electron;
  el.metaNode.textContent = info.node;
  el.metaChrome.textContent = info.chrome;
  if (info.pendingUpdate) {
    setStatus(
      "downloaded",
      `Atualização v${info.pendingUpdate} pronta.`,
      'Clique em "Reiniciar e instalar".',
    );
  }
}

window.updater.onStatus((payload) => {
  const { status, data } = payload;
  switch (status) {
    case "checking":
      setStatus("checking");
      el.checkBtn.disabled = true;
      break;
    case "available":
      setStatus(
        "available",
        `Nova versão v${data.version} disponível, baixando…`,
        data.releaseDate
          ? `Publicada em ${new Date(data.releaseDate).toLocaleString("pt-BR")}`
          : "",
      );
      break;
    case "downloading": {
      const percent = data.percent || 0;
      const mbps = data.bytesPerSecond
        ? (data.bytesPerSecond / 1024 / 1024).toFixed(2)
        : "0";
      const transferred = data.transferred
        ? (data.transferred / 1024 / 1024).toFixed(1)
        : "0";
      const total = data.total ? (data.total / 1024 / 1024).toFixed(1) : "0";
      setStatus(
        "downloading",
        `Baixando atualização… ${percent}%`,
        `${transferred} MB / ${total} MB · ${mbps} MB/s`,
      );
      el.progressBar.style.width = `${percent}%`;
      break;
    }
    case "downloaded":
      setStatus(
        "downloaded",
        `Versão v${data.version} pronta para instalar.`,
        'Clique em "Reiniciar e instalar" para aplicar agora.',
      );
      el.checkBtn.disabled = false;
      break;
    case "none":
      setStatus(
        "none",
        `Você está na versão mais recente${data.version ? ` (v${data.version})` : ""}.`,
        "",
      );
      el.checkBtn.disabled = false;
      break;
    case "error":
      setStatus("error", "Erro ao verificar atualização.", data.message || "");
      el.checkBtn.disabled = false;
      break;
  }
});

el.checkBtn.addEventListener("click", async () => {
  el.checkBtn.disabled = true;
  setStatus("checking");
  const result = await window.updater.check();
  if (!result.ok) {
    setStatus("error", "Falha ao verificar.", result.error);
    el.checkBtn.disabled = false;
  }
});

el.installBtn.addEventListener("click", async () => {
  el.installBtn.disabled = true;
  await window.updater.installNow();
});

loadInfo();
