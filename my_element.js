class ThreeEditor extends HTMLElement {
    static observedAttributes = ['width', 'height', 'initial-size'];
    
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._width = 800;
        this._height = 600;
        this._initialSize = 1.0;
        this.objects = [];
        this.selectedObject = null;
    }

    connectedCallback() {
        this.renderUI();
        this.initThree();
        this.setupEventListeners();
    }

    renderUI() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    position: relative;
                    background: #f0f0f0;
                    overflow: hidden;
                }
                canvas {
                    width: 100%;
                    height: 100%;
                }
                #ui {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: rgba(255,255,255,0.95);
                    padding: 12px;
                    border-radius: 8px;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
                    max-width: 260px;
                    width: auto;
                    z-index: 1;
                }
                .btn-group {
                    margin: 6px 0;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                }
                button {
                    padding: 6px 12px;
                    margin: 2px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    background: white;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.85em;
                    flex: 1 1 auto;
                    min-width: 60px;
                }
                button:hover {
                    background: #f8f8f8;
                }
                button.active {
                    background: #4CAF50;
                    color: white;
                    border-color: #45a049;
                }
                #colorPicker {
                    width: 100%;
                    height: 30px;
                    margin: 8px 0;
                    cursor: pointer;
                }
                @media (max-width: 480px) {
                    #ui {
                        top: 5px;
                        right: 5px;
                        padding: 8px;
                        max-width: 180px;
                    }
                    button {
                        padding: 4px 8px;
                        font-size: 0.75em;
                        min-width: 50px;
                    }
                }
            </style>
            <div id="ui">
                <div class="btn-group">
                    <button data-shape="cube">立方体</button>
                    <button data-shape="sphere">球体</button>
                    <button data-shape="cone">圆锥</button>
                    <button data-shape="cylinder">圆柱</button>
                </div>
                <input type="color" id="colorPicker" value="#ff0000">
                <div class="btn-group">
                    <button data-mode="translate" class="active">移动</button>
                    <button data-mode="rotate">旋转</button>
                    <button data-mode="scale">缩放</button>
                    <button id="clearBtn">清除</button>
                </div>
            </div>
        `;
    }

    initThree() {
        // 场景初始化
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this._width/this._height, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this._width, this._height);
        this.shadowRoot.appendChild(this.renderer.domElement);

        // 轨道控制器
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        // 光照系统
        this.scene.add(new THREE.AmbientLight(0x404040));
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 10, 10);
        this.scene.add(directionalLight);

        // 变换控制器
        this.transformControl = new THREE.TransformControls(this.camera, this.renderer.domElement);
        this.scene.add(this.transformControl);
        this.transformControl.setMode('translate');
        this.transformControl.setSpace('world');

        // 关键修改：添加拖动事件监听
        this.transformControl.addEventListener('dragging-changed', (event) => {
            this.controls.enabled = !event.value;
        });

        // 坐标辅助线
        this.scene.add(new THREE.AxesHelper(10));

        // 相机初始位置
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(0, 0, 0);

        // 动画循环
        const animate = () => {
            requestAnimationFrame(animate);
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        };
        animate();
    }

    setupEventListeners() {
        // 形状创建
        this.shadowRoot.querySelectorAll('[data-shape]').forEach(btn => {
            btn.addEventListener('click', () => this.createShape(btn.dataset.shape));
        });

        // 模式切换
        this.shadowRoot.querySelectorAll('[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.transformControl.setMode(btn.dataset.mode);
                this.shadowRoot.querySelectorAll('[data-mode]').forEach(b => 
                    b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // 颜色选择
        this.shadowRoot.querySelector('#colorPicker').addEventListener('input', e => {
            if (this.selectedObject) {
                this.selectedObject.material.color.set(e.target.value);
            }
        });

        // 清除按钮
        this.shadowRoot.querySelector('#clearBtn').addEventListener('click', () => this.clearAll());

        // 物体选择
        this.renderer.domElement.addEventListener('click', e => this.handleObjectClick(e));
        
        // 窗口缩放
        window.addEventListener('resize', () => this.updateSize());
    }

    createShape(type) {
        let geometry;
        const size = this._initialSize;
        
        switch(type) {
            case 'cube':
                geometry = new THREE.BoxGeometry(size, size, size);
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(size/2, 32, 32);
                break;
            case 'cone':
                geometry = new THREE.ConeGeometry(size/2, size*1.5, 32);
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(size/2, size/2, size*1.5, 32);
                break;
        }

        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
            transparent: true,
            opacity: 0.8
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            (Math.random() - 0.5) * 15,
            (Math.random() - 0.5) * 15,
            (Math.random() - 0.5) * 15
        );
        
        this.scene.add(mesh);
        this.objects.push(mesh);
    }

    handleObjectClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        const intersects = raycaster.intersectObjects(this.objects);
        intersects.length > 0 ? this.selectObject(intersects[0].object) : this.deselectObject();
    }

    selectObject(object) {
        if (this.selectedObject === object) return;
        this.deselectObject();
        
        this.selectedObject = object;
        object.material.opacity = 1.0;
        object.material.needsUpdate = true;
        this.transformControl.attach(object);
        this.transformControl.updateMatrixWorld();
        this.shadowRoot.querySelector('#colorPicker').value = object.material.color.getHexString();
    }

    deselectObject() {
        if (!this.selectedObject) return;
        
        this.selectedObject.material.opacity = 0.8;
        this.selectedObject.material.needsUpdate = true;
        this.transformControl.detach();
        this.selectedObject = null;
    }

    clearAll() {
        this.objects.forEach(obj => {
            this.scene.remove(obj);
            obj.geometry.dispose();
            obj.material.dispose();
        });
        this.objects = [];
        this.deselectObject();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'width') this._width = parseInt(newValue);
        if (name === 'height') this._height = parseInt(newValue);
        if (name === 'initial-size') this._initialSize = parseFloat(newValue);
        this.updateSize();
    }

    updateSize() {
        if (this.renderer) {
            this.renderer.setSize(this._width, this._height);
            this.camera.aspect = this._width / this._height;
            this.camera.updateProjectionMatrix();
        }
    }

    disconnectedCallback() {
        this.clearAll();
        this.renderer.dispose();
        this.transformControl.dispose();
        this.controls.dispose();
    }
}

class MarkdownEditor extends HTMLElement {
    static observedAttributes = ['content', 'theme', 'height', 'editor-height', 'editor-width', 'preview-width', 'button-size'];
    
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.history = [];
        this.historyIndex = -1;
        
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    --primary-color: #4a90e2;
                    --border-color: #e1e4e8;
                    --editor-bg: #ffffff;
                    --preview-bg: #fafbfc;
                    --code-bg: #282c34;
                    --box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                    --editor-height: ${this.getAttribute('editor-height') || '500px'};
                    --editor-width: ${this.getAttribute('editor-width') || '50%'};
                    --preview-width: ${this.getAttribute('preview-width') || '50%'};
                    --button-size: ${this.getAttribute('button-size') || '14px'};
                    font-family: system-ui;
                    display: block;
                }

                .container {
                    display: flex;
                    gap: 20px;
                    height: ${this.getAttribute('height') || '500px'};
                    padding: 20px;
                }

                .toolbar {
                    display: flex;
                    gap: calc(var(--button-size) * 0.8);
                    padding: calc(var(--button-size) * 0.7);
                    border-bottom: 2px solid var(--border-color);
                    background: var(--editor-bg);
                    margin-bottom: 20px;
                }

                .toolbar button {
                    font-size: var(--button-size);
                    padding: calc(var(--button-size) * 0.5) calc(var(--button-size) * 1);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    background: var(--editor-bg);
                    cursor: pointer;
                    transition: all 0.2s;
                    min-width: calc(var(--button-size) * 4);
                    color: #5a5a5a;
                }

                .toolbar button:hover {
                    background: var(--primary-color);
                    color: white;
                    transform: translateY(-1px);
                    box-shadow: var(--box-shadow);
                }

                .editor-pane {
                    width: var(--editor-width);
                    height: var(--editor-height);
                    min-width: 300px;
                }

                .preview-pane {
                    width: var(--preview-width);
                    height: var(--editor-height);
                    min-width: 300px;
                }

                #editor {
                    width: 100%;
                    height: 100%;
                    padding: 20px;
                    border: 2px solid var(--border-color);
                    border-radius: 12px;
                    resize: none;
                    font-size: var(--editor-font-size, 15px);
                    line-height: 1.8;
                    color: #24292e;
                    transition: all 0.3s ease;
                    box-shadow: var(--box-shadow);
                    background: var(--editor-bg);
                }

                #editor:focus {
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 3px rgba(74,144,226,0.1);
                    outline: none;
                }

                #preview {
                    width: 100%;
                    height: 100%;
                    padding: 30px;
                    overflow-y: auto;
                    border: 2px solid var(--border-color);
                    border-radius: 12px;
                    font-size: var(--preview-font-size, 16px);
                    background: var(--preview-bg);
                    box-shadow: var(--box-shadow);
                    color: #2d3339;
                    line-height: 1.7;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
                }

                #preview h1 {
                    font-size: 2.2em;
                    border-bottom: 2px solid var(--border-color);
                    padding-bottom: 0.3em;
                    margin: 1.5em 0 1em;
                }

                #preview h2 {
                    font-size: 1.8em;
                    border-bottom: 1px solid var(--border-color);
                    padding-bottom: 0.3em;
                    margin: 1.3em 0 0.8em;
                }

                #preview code:not(.katex) {
                    background: var(--code-bg);
                    color: #abb2bf;
                    padding: 0.2em 0.4em;
                    border-radius: 4px;
                    font-size: 0.95em;
                }

                #preview pre {
                    background: var(--code-bg) !important;
                    padding: 15px;
                    border-radius: 8px;
                    color: #abb2bf;
                }

                #preview pre code {
                    display: block;
                    padding: 1.2em;
                    border-radius: 8px;
                    overflow-x: auto;
                    line-height: 1.5;
                }

                #preview blockquote {
                    border-left: 4px solid var(--primary-color);
                    margin: 1em 0;
                    padding: 0.5em 1em;
                    background: #f8f9fa;
                    color: #6a737d;
                    border-radius: 4px 0 0 4px;
                }

                .katex { 
                    font-size: 1.05em !important;
                }

                .katex-error {
                    background: #fff0f0;
                    border-radius: 4px;
                    padding: 6px 10px;
                    color: #dc3545;
                    border: 1px dashed rgba(220, 53, 69, 0.3);
                }
            </style>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
            
            <div class="toolbar">
                <button title="撤销 (Ctrl+Z)" onclick="this.getRootNode().host.undo()">↩️ 撤销</button>
                <button title="复制 (Ctrl+C)" onclick="this.getRootNode().host.handleCopy()">⎘ 复制</button>
                <button title="粘贴 (Ctrl+V)" onclick="this.getRootNode().host.handlePaste()">📋 粘贴</button>
                <button title="放大字体 (Ctrl+Plus)" onclick="this.getRootNode().host.adjustFontSize(1)">➕</button>
                <button title="缩小字体 (Ctrl+Minus)" onclick="this.getRootNode().host.adjustFontSize(-1)">➖</button>
            </div>
            
            <div class="container">
                <div class="editor-pane">
                    <textarea id="editor"></textarea>
                </div>
                <div class="preview-pane">
                    <div id="preview"></div>
                </div>
            </div>
        `;

        this.editor = this.shadowRoot.getElementById('editor');
        this.preview = this.shadowRoot.getElementById('preview');
        this._debounceTimer = null;
    }

    connectedCallback() {
        this._initializeContent();
        this._setupMarkdown();
        this._setupEvents();
        this._saveHistory();
    }

    _initializeContent() {
        const presetContent = this.getAttribute('content');
        const scriptContent = this.querySelector('script[type="text/markdown"]')?.textContent.trim();
        
        // 解码并设置内容
        this.editor.value = presetContent ? 
            this._safeDecode(presetContent) : 
            (scriptContent || '');
        
        this._updatePreview();
    }

    _safeDecode(content) {
        try {
            return decodeURIComponent(content);
        } catch {
            return content;
        }
    }

    _setupMarkdown() {
        marked.setOptions({
            breaks: true,
            highlight: code => Prism.highlight(code, Prism.languages.javascript, 'javascript')
        });
    }

    _setupEvents() {
        this.editor.addEventListener('input', () => {
            clearTimeout(this._debounceTimer);
            this._debounceTimer = setTimeout(() => {
                this._updatePreview();
                this._saveHistory();
            }, 300);
        });

        this.editor.addEventListener('keydown', (e) => this._handleKeydown(e));
        this.editor.addEventListener('paste', (e) => this._handlePaste(e));
    }

    _handleKeydown(e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            this.undo();
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            this.adjustFontSize(1);
        }
        if ((e.ctrlKey || e.metaKey) && e.key === '-') {
            e.preventDefault();
            this.adjustFontSize(-1);
        }
    }

    async _handlePaste(e) {
        e.preventDefault();
        try {
            const text = await navigator.clipboard.readText();
            this._insertText(text);
        } catch (err) {
            const clipboardData = e.clipboardData || window.clipboardData;
            const text = clipboardData.getData('text/plain');
            if (text) this._insertText(text);
        }
    }

    _updatePreview() {
        const raw = this.editor.value;
        const withMath = raw.replace(
            /(?<!\\)(\${1,2})((?:\\\$|(?!\1).)+?)\1/g,
            (_, delim, content) => `\n<span class="katex${delim.length === 2 ? '-display' : ''}">${content}</span>\n`
        );
        this.preview.innerHTML = DOMPurify.sanitize(marked.parse(withMath));
        this._renderKatex();
    }

    _renderKatex() {
        this.preview.querySelectorAll('.katex, .katex-display').forEach(el => {
            if (el.hasAttribute('data-rendered')) return;
            try {
                katex.render(el.textContent, el, {
                    displayMode: el.classList.contains('katex-display'),
                    throwOnError: false
                });
                el.setAttribute('data-rendered', 'true');
            } catch (e) {
                el.outerHTML = `<span class="katex-error">公式错误: ${e.message.replace('KaTeX parse error: ', '')}</span>`;
            }
        });
    }

    _saveHistory() {
        const content = this.editor.value;
        if (content !== this.history[this.historyIndex]) {
            this.history = this.history.slice(0, this.historyIndex + 1);
            this.history.push(content);
            this.historyIndex++;
            if (this.history.length > 100) this.history.shift();
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.editor.value = this.history[this.historyIndex];
            this._updatePreview();
        }
    }

    handleCopy() {
        this.editor.select();
        navigator.clipboard.writeText(this.editor.value)
            .catch(() => alert('复制失败，请手动操作'));
    }

    async handlePaste() {
        try {
            const text = await navigator.clipboard.readText();
            this._insertText(text);
        } catch (err) {
            alert('粘贴需要用户授权');
        }
    }

    _insertText(text) {
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        const content = this.editor.value;
        this.editor.value = content.slice(0, start) + text + content.slice(end);
        this.editor.selectionStart = this.editor.selectionEnd = start + text.length;
        this._updatePreview();
        this._saveHistory();
    }

    adjustFontSize(step) {
        let editorSize = parseFloat(getComputedStyle(this.editor).fontSize);
        editorSize = Math.max(12, Math.min(24, editorSize + step));
        this.style.setProperty('--editor-font-size', `${editorSize}px`);
        this.style.setProperty('--preview-font-size', `${editorSize + 2}px`);
    }

    attributeChangedCallback(name, oldVal, newVal) {
        switch(name) {
            case 'content':
                this.editor.value = this._safeDecode(newVal || '');
                this._updatePreview();
                this._saveHistory();
                break;
            case 'theme':
                this.shadowRoot.querySelector('.container').style.flexDirection = 
                    newVal === 'vertical' ? 'column' : 'row';
                break;
            case 'height':
                this.shadowRoot.querySelector('.container').style.height = newVal;
                break;
            case 'editor-height':
                this.style.setProperty('--editor-height', newVal);
                break;
            case 'editor-width':
                this.style.setProperty('--editor-width', newVal);
                break;
            case 'preview-width':
                this.style.setProperty('--preview-width', newVal);
                break;
            case 'button-size':
                this.style.setProperty('--button-size', newVal);
                break;
        }
    }

    get value() { return this.editor.value; }
    set value(v) { 
        this.editor.value = v; 
        this._updatePreview();
        this._saveHistory();
    }
}

class SVGExporter extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // 扩展样式
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                max-width: 800px;
                margin: 20px auto;
                font-family: Arial, sans-serif;
                background-color: #f0f0f0;
            }
            .toolbar {
                display: flex;
                gap: 10px;
                margin-bottom: 10px;
                padding: 10px;
                background-color: white;
                border-radius: 5px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                flex-wrap: wrap;
            }
            .tool-group {
                display: flex;
                gap: 5px;
                align-items: center;
            }
            button {
                padding: 8px 16px;
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
            }
            button.active {
                background-color: #2196F3;
                box-shadow: 0 0 3px rgba(0,0,0,0.3);
            }
            button:hover {
                filter: brightness(1.1);
            }
            #drawingCanvas {
                border: 2px solid #ccc;
                background-color: white;
                touch-action: none;
            }
            .color-picker {
                width: 40px;
                height: 30px;
            }
            input[type="range"] {
                width: 100px;
            }
        `;

        // 增强的工具栏结构
        const template = document.createElement('template');
        template.innerHTML = `
            <div class="toolbar">
                <div class="tool-group">
                    <button data-mode="select" class="active">选区</button>
                    <button data-mode="pen">画笔</button>
                    <button data-mode="line">直线</button>
                    <button data-mode="arrow">箭头</button>
                    <button data-mode="rect">矩形</button>
                    <button data-mode="circle">圆形</button>
                </div>
                <div class="tool-group">
                    <input type="color" id="fillColor" class="color-picker" value="#000000">
                    <input type="color" id="strokeColor" class="color-picker" value="#000000">
                </div>
                <div class="tool-group">
                    <input type="range" id="strokeWidth" min="1" max="50" value="3">
                    <span id="strokeWidthValue">3px</span>
                </div>
                <div class="tool-group">
                    <button id="clearCanvas">清空</button>
                    <button id="exportSVG">导出SVG</button>
                </div>
            </div>
            <svg id="drawingCanvas" width="800" height="600"></svg>
        `;

        this.shadowRoot.append(style, template.content.cloneNode(true));
        
        // 初始化变量
        this.canvas = this.shadowRoot.getElementById('drawingCanvas');
        this.currentShape = null;
        this.startPoint = null;
        this.currentMode = 'select';
        this.isDrawing = false;
    }

    connectedCallback() {
        // 工具按钮事件
        this.shadowRoot.querySelectorAll('button[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
        });

        // 颜色和线条设置
        this.strokeWidth = this.shadowRoot.getElementById('strokeWidth');
        this.strokeWidth.addEventListener('input', () => {
            this.shadowRoot.getElementById('strokeWidthValue').textContent = 
                `${this.strokeWidth.value}px`;
        });

        // 其他事件
        this.shadowRoot.getElementById('clearCanvas').addEventListener('click', () => this.clearCanvas());
        this.shadowRoot.getElementById('exportSVG').addEventListener('click', () => this.exportSVG());

        // 画布事件
        this.canvas.addEventListener('mousedown', e => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', e => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.finishDrawing());
        this.canvas.addEventListener('mouseleave', () => this.finishDrawing());
    }

    setMode(mode) {
        this.currentMode = mode;
        this.shadowRoot.querySelectorAll('button[data-mode]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
    }

    startDrawing(e) {
        if (this.currentMode === 'select') return;
        
        this.isDrawing = true;
        this.startPoint = this.getCoordinates(e);
        
        switch(this.currentMode) {
            case 'pen':
                this.createPath();
                break;
            case 'line':
            case 'arrow':
            case 'rect':
            case 'circle':
                this.createShape();
                break;
        }
    }

    draw(e) {
        if (!this.isDrawing) return;
        
        const currentPoint = this.getCoordinates(e);
        const width = currentPoint.x - this.startPoint.x;
        const height = currentPoint.y - this.startPoint.y;

        switch(this.currentMode) {
            case 'pen':
                this.updatePath(currentPoint);
                break;
                
            case 'line':
            case 'arrow':
                this.updateLine(currentPoint);
                break;
                
            case 'rect':
                this.updateRect(width, height);
                break;
                
            case 'circle':
                this.updateCircle(width, height);
                break;
        }
    }

    finishDrawing() {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        
        // 箭头处理
        if (this.currentMode === 'arrow' && this.currentShape) {
            this.addArrowhead();
        }
        
        this.currentShape = null;
    }

    // 创建基础形状
    createPath() {
        this.currentShape = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.currentShape.setAttribute("fill", "none");
        this.currentShape.setAttribute("stroke", this.getStrokeColor());
        this.currentShape.setAttribute("stroke-width", this.strokeWidth.value);
        this.currentShape.setAttribute("d", `M ${this.startPoint.x} ${this.startPoint.y}`);
        this.canvas.appendChild(this.currentShape);
    }

    createShape() {
        const ns = "http://www.w3.org/2000/svg";
        switch(this.currentMode) {
            case 'line':
            case 'arrow':
                this.currentShape = document.createElementNS(ns, "line");
                break;
            case 'rect':
                this.currentShape = document.createElementNS(ns, "rect");
                break;
            case 'circle':
                this.currentShape = document.createElementNS(ns, "ellipse");
                break;
        }
        
        this.currentShape.setAttribute("fill", this.getFillColor());
        this.currentShape.setAttribute("stroke", this.getStrokeColor());
        this.currentShape.setAttribute("stroke-width", this.strokeWidth.value);
        this.canvas.appendChild(this.currentShape);
    }

    // 更新各种形状
    updatePath(point) {
        const d = this.currentShape.getAttribute("d");
        this.currentShape.setAttribute("d", `${d} L ${point.x} ${point.y}`);
    }

    updateLine(endPoint) {
        this.currentShape.setAttribute("x1", this.startPoint.x);
        this.currentShape.setAttribute("y1", this.startPoint.y);
        this.currentShape.setAttribute("x2", endPoint.x);
        this.currentShape.setAttribute("y2", endPoint.y);
    }

    updateRect(width, height) {
        this.currentShape.setAttribute("x", Math.min(this.startPoint.x, this.startPoint.x + width));
        this.currentShape.setAttribute("y", Math.min(this.startPoint.y, this.startPoint.y + height));
        this.currentShape.setAttribute("width", Math.abs(width));
        this.currentShape.setAttribute("height", Math.abs(height));
    }

    updateCircle(width, height) {
        const cx = this.startPoint.x + width/2;
        const cy = this.startPoint.y + height/2;
        this.currentShape.setAttribute("cx", cx);
        this.currentShape.setAttribute("cy", cy);
        this.currentShape.setAttribute("rx", Math.abs(width/2));
        this.currentShape.setAttribute("ry", Math.abs(height/2));
    }

    // 添加箭头标记
    addArrowhead() {
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        marker.setAttribute("id", "arrowhead");
        marker.setAttribute("markerWidth", "10");
        marker.setAttribute("markerHeight", "7");
        marker.setAttribute("refX", "10");
        marker.setAttribute("refY", "3.5");
        marker.setAttribute("orient", "auto");
        
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M 0 0 L 10 3.5 L 0 7");
        path.setAttribute("fill", this.getStrokeColor());
        marker.appendChild(path);
        
        this.canvas.appendChild(marker);
        this.currentShape.setAttribute("marker-end", "url(#arrowhead)");
    }

    // 辅助方法
    getCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    getStrokeColor() {
        return this.shadowRoot.getElementById('strokeColor').value;
    }

    getFillColor() {
        return this.shadowRoot.getElementById('fillColor').value;
    }

    clearCanvas() {
        while (this.canvas.firstChild) {
            this.canvas.removeChild(this.canvas.firstChild);
        }
    }

    exportSVG() {
        const svgData = new XMLSerializer().serializeToString(this.canvas);
        const blob = new Blob([svgData], {type: "image/svg+xml"});
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'drawing.svg';
        a.click();
        URL.revokeObjectURL(url);
    }
}

// 注册自定义元素
customElements.define('three-editor', ThreeEditor);
customElements.define('markdown-editor', MarkdownEditor);
customElements.define('svg-exporter', SVGExporter);
