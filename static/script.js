document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-upload');
  const fileLabel = document.getElementById('file-label');
  const innerContainer = document.querySelector('.inner-container');

  const predictSound = new Audio('/static/sounds/predict.mp3');
  const clearSound = new Audio('/static/sounds/cler-butn-click.mp3');
  const fileUploadSound = new Audio('/static/sounds/file-upload.mp3');

  window.onload = function() {
      var audio = document.getElementById("myAudio");
      audio.play();
  };

  // File upload feedback
  fileInput.addEventListener('change', function () {
      if (fileInput.files.length > 0) {
          fileLabel.textContent = "✅ File Uploaded";
          fileUploadSound.currentTime = 0;
          fileUploadSound.play();
          console.log("📁 File selected, sound played.");
      } else {
          fileLabel.textContent = "📁 Choose Image";
          console.log("📁 File cleared.");
      }
  });

  // Predict button sound + delayed form submission
  const predictBtn = document.querySelector('button[type="submit"]');
  const form = document.querySelector('form');

  if (predictBtn && form) {
      predictBtn.addEventListener('click', (e) => {
          e.preventDefault(); // Prevent immediate form submission
          console.log("🧪 Predict button clicked. Playing sound...");

          predictSound.currentTime = 0;
          predictSound.play();

          predictSound.addEventListener('ended', () => {
              console.log("🧪 Sound ended. Submitting form.");
              form.submit(); // Submit after sound ends
          }, { once: true }); // Trigger only once
      });
  }
  // Clear button logic
  const clearBtn = document.querySelector('.clear-btn');
  if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
          e.preventDefault();
          console.log("❌ Clear button clicked. Playing sound...");

          clearSound.currentTime = 0;
          clearSound.play();

          clearSound.addEventListener('ended', () => {
              console.log("🔁 Clear sound ended. Redirecting to home.");
              window.location.href = "/"; // Properly resets the state
          }, { once: true });
      });
  }
});

const canvas = document.getElementById('neuronCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const neurons = [];
const maxNeurons = 500;
const growthSpeed = 3;
const branchProbability = 0.04;
const neuronColor = 'rgba(0, 191, 255, 0.85)';
const cornerNeuronColor = 'rgba(0, 150, 255, 0.6)';
const newNeuronProbability = 0.05;
const cornerStartTime = 20000; // 20 seconds

// Get container bounds
const container = document.querySelector('.container');
let containerRect;

function updateContainerRect() {
  if (container) {
      containerRect = container.getBoundingClientRect();
  } else {
      containerRect = { left: 0, top: 0, right: 0, bottom: 0 };
  }
}

updateContainerRect();
window.addEventListener('resize', updateContainerRect);

// Coverage tracking (only outside the container)
const gridSize = 50;
let gridCols = Math.ceil(canvas.width / gridSize);
let gridRows = Math.ceil(canvas.height / gridSize);
let visitedGrid = Array.from({ length: gridCols }, () => Array(gridRows).fill(false));

function updateGridDimensions() {
  gridCols = Math.ceil(canvas.width / gridSize);
  gridRows = Math.ceil(canvas.height / gridSize);
  visitedGrid = Array.from({ length: gridCols }, () => Array(gridRows).fill(false));
}
window.addEventListener('resize', updateGridDimensions);

function isOutsideContainer(x, y) {
  if (!containerRect) return true; // If container not found, grow everywhere
  return x < containerRect.left - 50 || x > containerRect.right + 50 || y < containerRect.top - 50 || y > containerRect.bottom + 50;
}

function getCoverageRatio() {
  let visitedCount = 0;
  for (let x = 0; x < gridCols; x++) {
      for (let y = 0; y < gridRows; y++) {
          if (visitedGrid[x][y]) visitedCount++;
      }
  }
  const total = gridCols * gridRows;
  return visitedCount / total;
}

class Neuron {
  constructor(x, y, fromCorner = false) {
      this.x = x;
      this.y = y;
      this.fromCorner = fromCorner;
      this.branches = [];

      const angle = Math.random() * 2 * Math.PI;
      this.branches.push({
          x: x,
          y: y,
          angle: angle,
          path: [{ x, y }]
      });
  }

  grow() {
      const newBranches = [];

      for (let b of this.branches) {
          const angleVariation = (Math.random() - 0.5) * 0.8;
          b.angle += angleVariation;

          const newX = b.x + Math.cos(b.angle) * growthSpeed;
          const newY = b.y + Math.sin(b.angle) * growthSpeed;

          b.path.push({ x: newX, y: newY });
          b.x = newX;
          b.y = newY;

          if (Math.random() < branchProbability && neurons.length < maxNeurons && isOutsideContainer(newX, newY)) {
              newBranches.push(new Neuron(newX, newY, this.fromCorner));
          }
      }

      return newBranches;
  }

  draw() {
      ctx.strokeStyle = this.fromCorner ? cornerNeuronColor : neuronColor;
      ctx.lineWidth = this.fromCorner ? 0.4 : 1.2;

      for (let b of this.branches) {
          // Track coverage only outside the container
          if (isOutsideContainer(b.x, b.y)) {
              const col = Math.floor(b.x / gridSize);
              const row = Math.floor(b.y / gridSize);
              if (col >= 0 && col < gridCols && row >= 0 && row < gridRows) {
                  visitedGrid[col][row] = true;
              }
          }

          ctx.beginPath();
          for (let i = 0; i < b.path.length - 1; i++) {
              ctx.moveTo(b.path[i].x, b.path[i].y);
              ctx.lineTo(b.path[i + 1].x, b.path[i + 1].y);
          }
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(b.x, b.y, this.fromCorner ? 0.8 : 2, 0, 2 * Math.PI);
          ctx.fillStyle = this.fromCorner ? 'rgba(173, 216, 230, 0.3)' : 'rgba(173, 216, 230, 0.6)';
          ctx.fill();
      }
  }
}

const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
neurons.push(new Neuron(centerX, centerY));

const startTime = Date.now();

function animate() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.01)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const elapsed = Date.now() - startTime;
  const coverage = getCoverageRatio();

  // From corners after 20 seconds (if under coverage cap and outside container)
  if (
      elapsed > cornerStartTime &&
      Math.random() < newNeuronProbability &&
      neurons.length < maxNeurons &&
      coverage < 0.8
  ) {
      const corners = [
          { x: 0, y: 0 },
          { x: canvas.width, y: 0 },
          { x: 0, y: canvas.height },
          { x: canvas.width, y: canvas.height }
      ];
      const corner = corners[Math.floor(Math.random() * corners.length)];
      if (isOutsideContainer(corner.x, corner.y)) {
          neurons.push(new Neuron(corner.x, corner.y, true));
      }
  }

  const newNeurons = [];
  for (const neuron of neurons) {
      const children = neuron.grow();
      newNeurons.push(...children);
      neuron.draw();
  }

  for (let n of newNeurons) {
      if (
          Math.random() < newNeuronProbability &&
          neurons.length < maxNeurons &&
          coverage < 0.8 &&
          isOutsideContainer(n.x, n.y)
      ) {
          neurons.push(n);
      }
  }

  requestAnimationFrame(animate);
}

animate();

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  updateContainerRect();
  updateGridDimensions();
});
// Drag & Drop support
const uploadForm = document.getElementById('upload-form');

if (uploadForm) {
    // Highlight on drag
    ['dragenter', 'dragover'].forEach(event => {
        uploadForm.addEventListener(event, e => {
            e.preventDefault();
            e.stopPropagation();
            uploadForm.classList.add('drag-over');
        });
    });

    // Remove highlight on leave or drop
    ['dragleave', 'drop'].forEach(event => {
        uploadForm.addEventListener(event, e => {
            e.preventDefault();
            e.stopPropagation();
            uploadForm.classList.remove('drag-over');
        });
    });

    // Handle file drop
    uploadForm.addEventListener('drop', e => {
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;

            const changeEvent = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(changeEvent);

            console.log("📥 File dropped into #upload-form.");
        }
    });
}
