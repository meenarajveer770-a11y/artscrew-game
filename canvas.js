/**
 * ARTSCREW - Canvas Engine
 * Enhanced pencil size controls (slider + 6 presets), live size preview, 24 colors + custom color picker,
 * canvas background themes (White, Blackboard, Grid, Parchment), flood fill, and PNG export.
 */

class DrawingEngine {
  constructor(canvasId, onDrawAction) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.onDrawAction = onDrawAction;

    // Virtual coordinate resolution
    this.VIRTUAL_WIDTH = 800;
    this.VIRTUAL_HEIGHT = 550;
    this.canvas.width = this.VIRTUAL_WIDTH;
    this.canvas.height = this.VIRTUAL_HEIGHT;

    // State
    this.isDrawing = false;
    this.canDraw = false;
    this.lastX = 0;
    this.lastY = 0;
    this.activePointerId = null;
    this.currentColor = '#000000';
    this.currentSize = 8;
    this.currentTool = 'brush'; // 'brush', 'eraser', 'fill'
    this.bgTheme = 'white'; // 'white', 'black', 'grid', 'parchment'

    this.undoStack = [];
    this.maxUndo = 15;

    // 24 Vibrant Artist Colors
    this.colors = [
      '#000000', '#374151', '#9ca3af', '#ffffff',
      '#ef4444', '#f97316', '#f59e0b', '#eab308',
      '#10b981', '#06b6d4', '#0284c7', '#3b82f6',
      '#6366f1', '#8b5cf6', '#d946ef', '#ec4899',
      '#84cc16', '#14b8a6', '#64748b', '#78350f',
      '#b45309', '#f43f5e', '#a855f7', '#0ea5e9'
    ];

    this.init();
  }

  init() {
    this.clearLocal(false);
    this.initColorPalette();
    this.initBrushSizeControls();
    this.initEventListeners();
    this.saveState();
  }

  initColorPalette() {
    const paletteContainer = document.getElementById('color-palette');
    if (!paletteContainer) return;

    paletteContainer.innerHTML = '';
    this.colors.forEach((color, index) => {
      const swatch = document.createElement('div');
      swatch.className = `color-swatch ${index === 0 ? 'active' : ''}`;
      swatch.style.backgroundColor = color;
      swatch.setAttribute('data-color', color);
      swatch.setAttribute('title', color);
      swatch.addEventListener('click', () => {
        this.setColor(color);
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
      });
      paletteContainer.appendChild(swatch);
    });

    // Custom Color Picker input
    const customPicker = document.getElementById('custom-color-picker');
    if (customPicker) {
      customPicker.addEventListener('input', (e) => {
        this.setColor(e.target.value);
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      });
    }

    // Tools
    const btnFill = document.getElementById('tool-fill');
    if (btnFill) {
      btnFill.addEventListener('click', () => {
        this.currentTool = this.currentTool === 'fill' ? 'brush' : 'fill';
        btnFill.classList.toggle('active', this.currentTool === 'fill');
      });
    }

    const btnEraser = document.getElementById('tool-eraser');
    if (btnEraser) {
      btnEraser.addEventListener('click', () => {
        this.currentTool = this.currentTool === 'eraser' ? 'brush' : 'eraser';
        btnEraser.classList.toggle('active', this.currentTool === 'eraser');
      });
    }

    const btnUndo = document.getElementById('tool-undo');
    if (btnUndo) {
      btnUndo.addEventListener('click', () => {
        this.undo();
      });
    }

    const btnClear = document.getElementById('tool-clear');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        this.clear();
      });
    }

    // Canvas Background Theme Switcher
    const selectTheme = document.getElementById('select-bg-theme');
    if (selectTheme) {
      selectTheme.addEventListener('change', (e) => {
        this.setBgTheme(e.target.value);
      });
    }
  }

  initBrushSizeControls() {
    // 6 Quick Size Preset Buttons
    document.querySelectorAll('.size-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const size = parseInt(btn.dataset.size, 10);
        this.setSize(size);
      });
    });

    // Brush Size Slider
    const sizeSlider = document.getElementById('brush-size-slider');
    const sizeLabel = document.getElementById('brush-size-label');
    const sizePreviewDot = document.getElementById('brush-preview-dot');

    if (sizeSlider) {
      sizeSlider.addEventListener('input', (e) => {
        const size = parseInt(e.target.value, 10);
        this.setSize(size, false);
      });
    }
  }

  setSize(size, updateSlider = true) {
    this.currentSize = Math.max(1, Math.min(60, size));

    const sizeSlider = document.getElementById('brush-size-slider');
    const sizeLabel = document.getElementById('brush-size-label');
    const sizePreviewDot = document.getElementById('brush-preview-dot');

    if (updateSlider && sizeSlider) sizeSlider.value = this.currentSize;
    if (sizeLabel) sizeLabel.textContent = `${this.currentSize}px`;

    if (sizePreviewDot) {
      const displayPx = Math.min(32, Math.max(3, this.currentSize));
      sizePreviewDot.style.width = `${displayPx}px`;
      sizePreviewDot.style.height = `${displayPx}px`;
      sizePreviewDot.style.backgroundColor = this.currentTool === 'eraser' ? '#cbd5e1' : this.currentColor;
    }

    // Update active preset button highlight
    document.querySelectorAll('.size-preset-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.size, 10) === this.currentSize);
    });
  }

  setBgTheme(theme, broadcast = true) {
    this.bgTheme = theme;
    let bgColor = '#ffffff';

    if (theme === 'black') {
      bgColor = '#1e293b'; // Chalkboard dark
    } else if (theme === 'parchment') {
      bgColor = '#fef3c7'; // Warm parchment
    } else if (theme === 'grid') {
      bgColor = '#f8fafc';
    }

    this.canvas.style.backgroundColor = bgColor;

    if (broadcast && this.onDrawAction) {
      this.onDrawAction({ type: 'theme', theme });
    }
  }

  initEventListeners() {
    this.canvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    this.canvas.addEventListener('pointerup', (e) => this.handlePointerUp(e));
    this.canvas.addEventListener('pointercancel', (e) => this.handlePointerUp(e));

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener('dragstart', (e) => e.preventDefault());
  }

  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? (this.VIRTUAL_WIDTH / rect.width) : 1;
    const scaleY = rect.height > 0 ? (this.VIRTUAL_HEIGHT / rect.height) : 1;

    let x = Math.round((e.clientX - rect.left) * scaleX);
    let y = Math.round((e.clientY - rect.top) * scaleY);

    x = Math.max(0, Math.min(this.VIRTUAL_WIDTH, x));
    y = Math.max(0, Math.min(this.VIRTUAL_HEIGHT, y));

    return { x, y };
  }

  handlePointerDown(e) {
    if (!this.canDraw) return;
    e.preventDefault();

    try {
      this.canvas.setPointerCapture(e.pointerId);
      this.activePointerId = e.pointerId;
    } catch (err) {}

    const { x, y } = this.getCanvasCoords(e);
    const activeColor = this.currentTool === 'eraser' ? '#ffffff' : this.currentColor;

    if (this.currentTool === 'fill') {
      this.floodFill(x, y, activeColor);
      this.saveState();
      if (this.onDrawAction) {
        this.onDrawAction({ type: 'fill', x, y, color: activeColor });
      }
      return;
    }

    this.isDrawing = true;
    this.lastX = x;
    this.lastY = y;

    const endX = x + 0.1;
    const endY = y + 0.1;
    this.drawLine(x, y, endX, endY, activeColor, this.currentSize);

    if (this.onDrawAction) {
      this.onDrawAction({
        type: 'line',
        x0: x,
        y0: y,
        x1: endX,
        y1: endY,
        color: activeColor,
        size: this.currentSize
      });
    }
  }

  handlePointerMove(e) {
    if (!this.canDraw || !this.isDrawing) return;
    e.preventDefault();

    const { x, y } = this.getCanvasCoords(e);
    if (x === this.lastX && y === this.lastY) return;

    const activeColor = this.currentTool === 'eraser' ? '#ffffff' : this.currentColor;
    this.drawLine(this.lastX, this.lastY, x, y, activeColor, this.currentSize);

    if (this.onDrawAction) {
      this.onDrawAction({
        type: 'line',
        x0: this.lastX,
        y0: this.lastY,
        x1: x,
        y1: y,
        color: activeColor,
        size: this.currentSize
      });
    }

    this.lastX = x;
    this.lastY = y;
  }

  handlePointerUp(e) {
    if (this.activePointerId !== null) {
      try {
        this.canvas.releasePointerCapture(this.activePointerId);
      } catch (err) {}
      this.activePointerId = null;
    }

    if (this.isDrawing) {
      this.isDrawing = false;
      this.saveState();
    }
  }

  drawLine(x0, y0, x1, y1, color, size) {
    const numX0 = Number(x0);
    const numY0 = Number(y0);
    const numX1 = Number(x1);
    const numY1 = Number(y1);
    const numSize = Number(size) || 8;

    if (isNaN(numX0) || isNaN(numY0) || isNaN(numX1) || isNaN(numY1)) return;

    this.ctx.beginPath();
    this.ctx.moveTo(numX0, numY0);
    this.ctx.lineTo(numX1, numY1);
    this.ctx.strokeStyle = color || '#000000';
    this.ctx.lineWidth = numSize;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.stroke();
    this.ctx.closePath();
  }

  setColor(color) {
    this.currentColor = color;
    if (this.currentTool === 'eraser') {
      this.currentTool = 'brush';
      const btnEraser = document.getElementById('tool-eraser');
      if (btnEraser) btnEraser.classList.remove('active');
    }
    const sizePreviewDot = document.getElementById('brush-preview-dot');
    if (sizePreviewDot) sizePreviewDot.style.backgroundColor = color;
  }

  setCanDraw(allowed) {
    this.canDraw = allowed;
    const toolbar = document.getElementById('toolbar');
    if (toolbar) {
      toolbar.classList.toggle('disabled', !allowed);
    }
    this.canvas.style.cursor = allowed ? (this.currentTool === 'fill' ? 'cell' : 'crosshair') : 'default';
  }

  clear(broadcast = true) {
    this.clearLocal(true);
    if (broadcast && this.onDrawAction) {
      this.onDrawAction({ type: 'clear' });
    }
  }

  clearLocal(save = true) {
    this.ctx.fillStyle = this.bgTheme === 'black' ? '#1e293b' : '#ffffff';
    this.ctx.fillRect(0, 0, this.VIRTUAL_WIDTH, this.VIRTUAL_HEIGHT);
    if (save) this.saveState();
  }

  saveState() {
    if (this.undoStack.length >= this.maxUndo) {
      this.undoStack.shift();
    }
    this.undoStack.push(this.ctx.getImageData(0, 0, this.VIRTUAL_WIDTH, this.VIRTUAL_HEIGHT));
  }

  undo() {
    if (this.undoStack.length > 1) {
      this.undoStack.pop();
      const previous = this.undoStack[this.undoStack.length - 1];
      this.ctx.putImageData(previous, 0, 0);
      if (this.onDrawAction) {
        this.onDrawAction({ type: 'undo', imageData: this.canvas.toDataURL() });
      }
    }
  }

  executeRemoteAction(action) {
    if (!action) return;

    if (action.type === 'line') {
      this.drawLine(action.x0, action.y0, action.x1, action.y1, action.color, action.size);
    } else if (action.type === 'fill') {
      this.floodFill(action.x, action.y, action.color);
    } else if (action.type === 'clear') {
      this.clearLocal(false);
    } else if (action.type === 'theme') {
      this.setBgTheme(action.theme, false);
    } else if (action.type === 'undo' && action.imageData) {
      const img = new Image();
      img.onload = () => {
        this.ctx.drawImage(img, 0, 0);
      };
      img.src = action.imageData;
    }
  }

  floodFill(startX, startY, fillColorHex) {
    startX = Math.floor(startX);
    startY = Math.floor(startY);
    if (startX < 0 || startX >= this.VIRTUAL_WIDTH || startY < 0 || startY >= this.VIRTUAL_HEIGHT) return;

    const imgData = this.ctx.getImageData(0, 0, this.VIRTUAL_WIDTH, this.VIRTUAL_HEIGHT);
    const data = imgData.data;

    const fillR = parseInt(fillColorHex.slice(1, 3), 16) || 0;
    const fillG = parseInt(fillColorHex.slice(3, 5), 16) || 0;
    const fillB = parseInt(fillColorHex.slice(5, 7), 16) || 0;

    const startIndex = (startY * this.VIRTUAL_WIDTH + startX) * 4;
    const startR = data[startIndex];
    const startG = data[startIndex + 1];
    const startB = data[startIndex + 2];

    if (startR === fillR && startG === fillG && startB === fillB) return;

    const matchStartColor = (idx) => {
      return Math.abs(data[idx] - startR) + Math.abs(data[idx + 1] - startG) + Math.abs(data[idx + 2] - startB) < 36;
    };

    const colorPixel = (idx) => {
      data[idx] = fillR;
      data[idx + 1] = fillG;
      data[idx + 2] = fillB;
      data[idx + 3] = 255;
    };

    const pixelStack = [[startX, startY]];
    const width = this.VIRTUAL_WIDTH;
    const height = this.VIRTUAL_HEIGHT;

    while (pixelStack.length > 0) {
      const [curX, curY] = pixelStack.pop();
      let y1 = curY;
      let idx = (y1 * width + curX) * 4;

      while (y1 >= 0 && matchStartColor(idx)) {
        y1--;
        idx -= width * 4;
      }
      y1++;
      idx += width * 4;

      let spanLeft = false;
      let spanRight = false;

      while (y1 < height && matchStartColor(idx)) {
        colorPixel(idx);

        if (curX > 0) {
          if (matchStartColor(idx - 4)) {
            if (!spanLeft) {
              pixelStack.push([curX - 1, y1]);
              spanLeft = true;
            }
          } else if (spanLeft) {
            spanLeft = false;
          }
        }

        if (curX < width - 1) {
          if (matchStartColor(idx + 4)) {
            if (!spanRight) {
              pixelStack.push([curX + 1, y1]);
              spanRight = true;
            }
          } else if (spanRight) {
            spanRight = false;
          }
        }

        y1++;
        idx += width * 4;
      }
    }

    this.ctx.putImageData(imgData, 0, 0);
  }

  downloadImage(wordName = 'Drawing') {
    const link = document.createElement('a');
    link.download = `ARTSCREW-${wordName}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}
