const canvas = document.querySelector("#stage");
const ctx = canvas.getContext("2d");
const photoInput = document.querySelector("#photoInput");
const zoomRange = document.querySelector("#zoomRange");
const resetButton = document.querySelector("#resetButton");
const exportButton = document.querySelector("#exportButton");
const resultPanel = document.querySelector("#resultPanel");
const resultImage = document.querySelector("#resultImage");
const downloadLink = document.querySelector("#downloadLink");

const frame = new Image();
frame.src = "./frame.png";

let photo = null;
let photoUrl = "";
let imageState = {
  x: 0,
  y: 0,
  scale: 1,
  baseScale: 1,
};

const pointers = new Map();
let dragStart = null;
let pinchStart = null;

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#d7f7f2";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (photo) {
    const width = photo.width * imageState.baseScale * imageState.scale;
    const height = photo.height * imageState.baseScale * imageState.scale;
    ctx.drawImage(photo, imageState.x - width / 2, imageState.y - height / 2, width, height);
  }

  if (frame.complete) {
    ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
  }
}

function setEnabled(enabled) {
  zoomRange.disabled = !enabled;
  resetButton.disabled = !enabled;
  exportButton.disabled = !enabled;
}

function fitPhoto() {
  if (!photo) return;
  imageState.baseScale = Math.max(canvas.width / photo.width, canvas.height / photo.height);
  imageState.scale = 1;
  imageState.x = canvas.width / 2;
  imageState.y = canvas.height / 2;
  zoomRange.value = "1";
  draw();
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clampScale(value) {
  return Math.min(3, Math.max(0.35, value));
}

photoInput.addEventListener("change", () => {
  const file = photoInput.files && photoInput.files[0];
  if (!file) return;

  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = URL.createObjectURL(file);
  const nextPhoto = new Image();
  nextPhoto.onload = () => {
    photo = nextPhoto;
    setEnabled(true);
    resultPanel.hidden = true;
    fitPhoto();
  };
  nextPhoto.src = photoUrl;
});

zoomRange.addEventListener("input", () => {
  imageState.scale = clampScale(Number(zoomRange.value));
  draw();
});

resetButton.addEventListener("click", () => {
  fitPhoto();
  resultPanel.hidden = true;
});

exportButton.addEventListener("click", () => {
  draw();
  const dataUrl = canvas.toDataURL("image/png");
  resultImage.src = dataUrl;
  downloadLink.href = dataUrl;
  resultPanel.hidden = false;
});

canvas.addEventListener("pointerdown", (event) => {
  if (!photo) return;
  canvas.setPointerCapture(event.pointerId);
  const point = getCanvasPoint(event);
  pointers.set(event.pointerId, point);

  if (pointers.size === 1) {
    dragStart = {
      point,
      x: imageState.x,
      y: imageState.y,
    };
  }

  if (pointers.size === 2) {
    const [first, second] = [...pointers.values()];
    pinchStart = {
      distance: distance(first, second),
      scale: imageState.scale,
    };
  }
});

canvas.addEventListener("pointermove", (event) => {
  if (!photo || !pointers.has(event.pointerId)) return;
  const point = getCanvasPoint(event);
  pointers.set(event.pointerId, point);

  if (pointers.size === 1 && dragStart) {
    imageState.x = dragStart.x + point.x - dragStart.point.x;
    imageState.y = dragStart.y + point.y - dragStart.point.y;
    draw();
  }

  if (pointers.size === 2 && pinchStart) {
    const [first, second] = [...pointers.values()];
    const nextScale = clampScale(pinchStart.scale * (distance(first, second) / pinchStart.distance));
    imageState.scale = nextScale;
    zoomRange.value = String(nextScale);
    draw();
  }
});

function releasePointer(event) {
  pointers.delete(event.pointerId);
  dragStart = null;
  pinchStart = null;

  if (pointers.size === 1) {
    const [point] = [...pointers.values()];
    dragStart = {
      point,
      x: imageState.x,
      y: imageState.y,
    };
  }
}

canvas.addEventListener("pointerup", releasePointer);
canvas.addEventListener("pointercancel", releasePointer);
frame.addEventListener("load", draw);
draw();
