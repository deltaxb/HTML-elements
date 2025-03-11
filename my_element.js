// ThreeEditor: 一个使用 Three.js 的 3D 对象编辑器
class ThreeEditor extends HTMLElement {
    // 定义当属性变化时会触发 attributeChangedCallback 的属性
    static observedAttributes = ['width', 'height', 'initial-size'];
    
    constructor() {
        super();
        // 创建 Shadow DOM 以实现封装
        this.attachShadow({ mode: 'open' });
        // 设置默认宽度、高度和初始大小
        this._width = 800;
        this._height = 600;
        this._initialSize = 1.0;
        // 存储所有创建的对象并跟踪当前选中对象
        this.objects = [];
        this.selectedObject = null;
    }

    // 当元素被添加到 DOM 时调用
    connectedCallback() {
        this.renderUI();        // 设置 HTML 和 CSS 界面
        this.initThree();       // 初始化 Three.js 场景
        this.setupEventListeners();  // 添加交互事件监听
    }

    // 在 Shadow DOM 中渲染用户界面控件
    renderUI() {
        this.shadowRoot.innerHTML = `
            <style>
                /* 宿主元素样式 */
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
                /* 控制面板样式 */
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
                /* 小屏幕的响应式设计 */
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
                <!-- 创建形状的按钮 -->
                <div class="btn-group">
                    <button data-shape="cube">立方体</button>
                    <button data-shape="sphere">球体</button>
                    <button data-shape="cone">圆锥</button>
                    <button data-shape="cylinder">圆柱</button>
                </div>
                <!-- 颜色选择器，用于选中对象的颜色调整 -->
                <input type="color" id="colorPicker" value="#ff0000">
                <!-- 变换模式按钮 -->
                <div class="btn-group">
                    <button data-mode="translate" class="active">移动</button>
                    <button data-mode="rotate">旋转</button>
                    <button data-mode="scale">缩放</button>
                    <button id="clearBtn">清除</button>
                </div>
            </div>
        `;
    }

    // 初始化 Three.js 场景和相关组件
    initThree() {
        // 创建场景
        this.scene = new THREE.Scene();
        // 设置相机
        this.camera = new THREE.PerspectiveCamera(75, this._width/this._height, 0.1, 1000);
        // 初始化渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this._width, this._height);
        this.shadowRoot.appendChild(this.renderer.domElement);

        // 添加轨道控制器以实现相机移动
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        // 添加光照
        this.scene.add(new THREE.AmbientLight(0x404040));
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 10, 10);
        this.scene.add(directionalLight);

        // 设置变换控制器
        this.transformControl = new THREE.TransformControls(this.camera, this.renderer.domElement);
        this.scene.add(this.transformControl);
        this.transformControl.setMode('translate');
        this.transformControl.setSpace('world');

        // 在拖动时禁用轨道控制器
        this.transformControl.addEventListener('dragging-changed', (event) => {
            this.controls.enabled = !event.value;
        });

        // 添加坐标轴辅助线
        this.scene.add(new THREE.AxesHelper(10));

        // 设置初始相机位置
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

    // 设置用户界面交互的事件监听器
    setupEventListeners() {
        // 形状创建按钮
        this.shadowRoot.querySelectorAll('[data-shape]').forEach(btn => {
            btn.addEventListener('click', () => this.createShape(btn.dataset.shape));
        });

        // 变换模式切换按钮
        this.shadowRoot.querySelectorAll('[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.transformControl.setMode(btn.dataset.mode);
                this.shadowRoot.querySelectorAll('[data-mode]').forEach(b => 
                    b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // 颜色选择器变化事件
        this.shadowRoot.querySelector('#colorPicker').addEventListener('input', e => {
            if (this.selectedObject) {
                this.selectedObject.material.color.set(e.target.value);
            }
        });

        // 清除按钮
        this.shadowRoot.querySelector('#clearBtn').addEventListener('click', () => this.clearAll());

        // 通过点击选择物体
        this.renderer.domElement.addEventListener('click', e => this.handleObjectClick(e));
        
        // 窗口大小调整事件
        window.addEventListener('resize', () => this.updateSize());
    }

    // 根据类型创建新的 3D 形状
    createShape(type) {
        let geometry;
        const size = this._initialSize;
        
        // 根据形状类型定义几何体
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

        // 创建带有随机颜色的材质
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
            transparent: true,
            opacity: 0.8
        });

        // 创建网格并随机定位
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            (Math.random() - 0.5) * 15,
            (Math.random() - 0.5) * 15,
            (Math.random() - 0.5) * 15
        );
        
        this.scene.add(mesh);
        this.objects.push(mesh);
    }

    // 通过射线投射处理对象选择
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

    // 选择对象以进行变换
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

    // 取消当前对象的选择
    deselectObject() {
        if (!this.selectedObject) return;
        
        this.selectedObject.material.opacity = 0.8;
        this.selectedObject.material.needsUpdate = true;
        this.transformControl.detach();
        this.selectedObject = null;
    }

    // 从场景中清除所有对象
    clearAll() {
        this.objects.forEach(obj => {
            this.scene.remove(obj);
            obj.geometry.dispose();
            obj.material.dispose();
        });
        this.objects = [];
        this.deselectObject();
    }

    // 处理属性变化
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'width') this._width = parseInt(newValue);
        if (name === 'height') this._height = parseInt(newValue);
        if (name === 'initial-size') this._initialSize = parseFloat(newValue);
        this.updateSize();
    }

    // 更新渲染器和相机大小
    updateSize() {
        if (this.renderer) {
            this.renderer.setSize(this._width, this._height);
            this.camera.aspect = this._width / this._height;
            this.camera.updateProjectionMatrix();
        }
    }

    // 元素移除时的清理工作
    disconnectedCallback() {
        this.clearAll();
        this.renderer.dispose();
        this.transformControl.dispose();
        this.controls.dispose();
    }
}

// MarkdownEditor: 一个带有实时预览的 Markdown 编辑器
class MarkdownEditor extends HTMLElement {
    static observedAttributes = ['content', 'theme', 'height', 'editor-height', 'editor-width', 'preview-width', 'button-size'];
    
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        // 用于撤销功能的历史记录
        this.history = [];
        this.historyIndex = -1;
        
        // 初始 HTML 结构
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    /* 用于主题的自定义属性 */
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

                /* Markdown 样式 */
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
            <!-- 加载 KaTeX 用于数学公式渲染 -->
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
            
            <!-- 工具栏，包含基本编辑控制 -->
            <div class="toolbar">
                <button title="撤销 (Ctrl+Z)" onclick="this.getRootNode().host.undo()">↩️ 撤销</button>
                <button title="复制 (Ctrl+C)" onclick="this.getRootNode().host.handleCopy()">⎘ 复制</button>
                <button title="粘贴 (Ctrl+V)" onclick="this.getRootNode().host.handlePaste()">📋 粘贴</button>
                <button title="放大字体 (Ctrl+Plus)" onclick="this.getRootNode().host.adjustFontSize(1)">➕</button>
                <button title="缩小字体 (Ctrl+Minus)" onclick="this.getRootNode().host.adjustFontSize(-1)">➖</button>
            </div>
            
            <!-- 编辑器和预览的分栏视图 -->
            <div class="container">
                <div class="editor-pane">
                    <textarea id="editor"></textarea>
                </div>
                <div class="preview-pane">
                    <div id="preview"></div>
                </div>
            </div>
        `;

        // 存储编辑器和预览元素的引用
        this.editor = this.shadowRoot.getElementById('editor');
        this.preview = this.shadowRoot.getElementById('preview');
        this._debounceTimer = null;
    }

    // 当元素被添加到 DOM 时初始化
    connectedCallback() {
        this._initializeContent();
        this._setupMarkdown();
        this._setupEvents();
        this._saveHistory();
    }

    // 从属性或脚本标签设置初始内容
    _initializeContent() {
        const presetContent = this.getAttribute('content');
        const scriptContent = this.querySelector('script[type="text/markdown"]')?.textContent.trim();
        
        this.editor.value = presetContent ? 
            this._safeDecode(presetContent) : 
            (scriptContent || '');
        
        this._updatePreview();
    }

    // 安全解码 URI 内容
    _safeDecode(content) {
        try {
            return decodeURIComponent(content);
        } catch {
            return content;
        }
    }

    // 配置 Markdown 解析器
    _setupMarkdown() {
        marked.setOptions({
            breaks: true,
            highlight: code => Prism.highlight(code, Prism.languages.javascript, 'javascript')
        });
    }

    // 设置事件处理程序
    _setupEvents() {
        // 输入事件处理，延迟更新预览
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

    // 处理键盘快捷键
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

    // 处理粘贴事件，使用剪贴板 API
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

    // 更新预览区域，渲染 Markdown 内容
    _updatePreview() {
        const raw = this.editor.value;
        const withMath = raw.replace(
            /(?<!\\)(\${1,2})((?:\\\$|(?!\1).)+?)\1/g,
            (_, delim, content) => `\n<span class="katex${delim.length === 2 ? '-display' : ''}">${content}</span>\n`
        );
        this.preview.innerHTML = DOMPurify.sanitize(marked.parse(withMath));
        this._renderKatex();
    }

    // 使用 KaTeX 渲染数学公式
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

    // 保存当前状态到历史记录
    _saveHistory() {
        const content = this.editor.value;
        if (content !== this.history[this.historyIndex]) {
            this.history = this.history.slice(0, this.historyIndex + 1);
            this.history.push(content);
            this.historyIndex++;
            if (this.history.length > 100) this.history.shift();
        }
    }

    // 撤销上一次更改
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.editor.value = this.history[this.historyIndex];
            this._updatePreview();
        }
    }

    // 将编辑器内容复制到剪贴板
    handleCopy() {
        this.editor.select();
        navigator.clipboard.writeText(this.editor.value)
            .catch(() => alert('复制失败，请手动操作'));
    }

    // 从剪贴板粘贴内容
    async handlePaste() {
        try {
            const text = await navigator.clipboard.readText();
            this._insertText(text);
        } catch (err) {
            alert('粘贴需要用户授权');
        }
    }

    // 在光标位置插入文本
    _insertText(text) {
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        const content = this.editor.value;
        this.editor.value = content.slice(0, start) + text + content.slice(end);
        this.editor.selectionStart = this.editor.selectionEnd = start + text.length;
        this._updatePreview();
        this._saveHistory();
    }

    // 调整编辑器和预览的字体大小
    adjustFontSize(step) {
        let editorSize = parseFloat(getComputedStyle(this.editor).fontSize);
        editorSize = Math.max(12, Math.min(24, editorSize + step));
        this.style.setProperty('--editor-font-size', `${editorSize}px`);
        this.style.setProperty('--preview-font-size', `${editorSize + 2}px`);
    }

    // 处理属性变化
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

    // 获取和设置编辑器内容的 getter 和 setter
    get value() { return this.editor.value; }
    set value(v) { 
        this.editor.value = v; 
        this._updatePreview();
        this._saveHistory();
    }
}

// SVGExporter: 一个支持导出功能的 SVG 绘图工具
class SVGExporter extends HTMLElement {
    static get observedAttributes() {
        return ['canvas-width', 'canvas-height', 'default-tool'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // 默认属性值
        this._canvasWidth = 800;
        this._canvasHeight = 600;
        this.currentTool = 'freehand';
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistorySteps = 100;

        // 样式定义
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                margin: 20px auto;
                font-family: Arial, sans-serif;
                background-color: #f0f0f0;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            .toolbar {
                margin-bottom: 10px;
                padding: 10px;
                background-color: white;
                border-radius: 5px;
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
            }
            button, select {
                padding: 8px 16px;
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
            }
            button:hover, select:hover {
                background-color: #45a049;
            }
            button:disabled {
                background-color: #cccccc !important;
                cursor: not-allowed;
                opacity: 0.7;
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
            .mode-indicator {
                padding: 5px 10px;
                border-radius: 3px;
                font-weight: bold;
            }
            .draw-mode { background-color: #4CAF50; }
            .select-mode { background-color: #2196F3; }
            #coordDisplay {
                margin-left: auto;
                font-family: monospace;
            }
        `;

        // HTML 模板
        const template = document.createElement('template');
        template.innerHTML = `
            <div class="toolbar">
                <select id="toolSelect">
                    <option value="freehand">自由绘制</option>
                    <option value="line">直线</option>
                    <option value="rect">矩形</option>
                    <option value="circle">圆形</option>
                </select>
                <button id="toggleMode">切换模式</button>
                <span id="modeIndicator" class="mode-indicator draw-mode">绘图模式</span>
                <button id="clearCanvas">清空</button>
                <button id="exportSVG">导出SVG</button>
                <button id="undoBtn">撤销 (Ctrl+Z)</button>
                <input type="color" id="colorPicker" class="color-picker">
                <input type="range" id="brushSize" min="1" max="50" value="3">
                <span id="brushSizeValue">3px</span>
                <span id="coordDisplay">X: 0, Y: 0</span>
            </div>
            <svg id="drawingCanvas" tabindex="0"></svg>
        `;

        this.shadowRoot.append(style, template.content.cloneNode(true));
        
        // 元素引用
        this.canvas = this.shadowRoot.getElementById('drawingCanvas');
        this.colorPicker = this.shadowRoot.getElementById('colorPicker');
        this.brushSize = this.shadowRoot.getElementById('brushSize');
        this.modeIndicator = this.shadowRoot.getElementById('modeIndicator');
        
        // 绘图状态
        this.isDrawing = false;
        this.currentElement = null;
        this.mode = 'draw';
        this.selection = null;
        this.selectionRect = null;
        this.startPoint = null;
        this.prevPoint = null;
        
        this.handleKeydown = this.handleKeydown.bind(this);
    }

    // 处理属性变化
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        
        switch(name) {
            case 'canvas-width':
                this._canvasWidth = Math.max(100, parseInt(newValue) || 800);
                this.updateCanvasSize();
                break;
            case 'canvas-height':
                this._canvasHeight = Math.max(100, parseInt(newValue) || 600);
                this.updateCanvasSize();
                break;
            case 'default-tool':
                if (['freehand', 'line', 'rect', 'circle'].includes(newValue)) {
                    this.currentTool = newValue;
                    this.updateToolSelect();
                }
                break;
        }
    }

    // 当元素被添加到 DOM 时初始化
    connectedCallback() {
        this._canvasWidth = parseInt(this.getAttribute('canvas-width')) || 800;
        this._canvasHeight = parseInt(this.getAttribute('canvas-height')) || 600;
        this.currentTool = this.getAttribute('default-tool') || 'freehand';
        this.updateCanvasSize();
        this.updateToolSelect();

        // 事件监听器
        this.shadowRoot.getElementById('toggleMode').addEventListener('click', () => this.toggleMode());
        this.shadowRoot.getElementById('clearCanvas').addEventListener('click', () => this.clearCanvas());
        this.shadowRoot.getElementById('exportSVG').addEventListener('click', () => this.exportSVG());
        this.shadowRoot.getElementById('undoBtn').addEventListener('click', () => this.undo());
        this.shadowRoot.getElementById('toolSelect').addEventListener('change', e => {
            this.currentTool = e.target.value;
        });

        this.brushSize.addEventListener('input', () => {
            this.shadowRoot.getElementById('brushSizeValue').textContent = 
                `${this.brushSize.value}px`;
        });

        // 绘图事件处理
        const handleStart = e => this.handleStart(e);
        const handleMove = e => this.handleMove(e);
        const handleEnd = () => this.handleEnd();

        this.canvas.addEventListener('mousedown', handleStart);
        this.canvas.addEventListener('mousemove', handleMove);
        this.canvas.addEventListener('mouseup', handleEnd);
        this.canvas.addEventListener('mouseleave', handleEnd);
        this.canvas.addEventListener('touchstart', handleStart);
        this.canvas.addEventListener('touchmove', handleMove);
        this.canvas.addEventListener('touchend', handleEnd);
        document.addEventListener('keydown', this.handleKeydown);

        // 坐标显示
        this.canvas.addEventListener('mousemove', e => {
            const pos = this.getCoordinates(e);
            this.shadowRoot.getElementById('coordDisplay').textContent = 
                `X: ${Math.round(pos.x)}, Y: ${Math.round(pos.y)}`;
        });

        this.saveState();
    }

    // 当元素从 DOM 中移除时清理
    disconnectedCallback() {
        document.removeEventListener('keydown', this.handleKeydown);
    }

    // 更新画布尺寸
    updateCanvasSize() {
        this.canvas.setAttribute('width', this._canvasWidth);
        this.canvas.setAttribute('height', this._canvasHeight);
        
        const rect = this.canvas.getBoundingClientRect();
        this.scaleX = this.canvas.width.baseVal.value / rect.width;
        this.scaleY = this.canvas.height.baseVal.value / rect.height;
    }

    // 同步工具选择下拉菜单
    updateToolSelect() {
        const toolSelect = this.shadowRoot.getElementById('toolSelect');
        if (toolSelect) {
            toolSelect.value = this.currentTool;
        }
    }

    // 保存当前状态以便撤销
    saveState() {
        const snapshot = {
            elements: Array.from(this.canvas.children).map(el => el.cloneNode(true)),
            selection: this.selection ? {...this.selection} : null
        };
        this.undoStack.push(snapshot);
        if(this.undoStack.length > this.maxHistorySteps) this.undoStack.shift();
        this.redoStack = [];
        this.updateUndoButton();
    }

    // 撤销上一次操作
    undo() {
        if(this.undoStack.length < 2) return;
        this.redoStack.push(this.undoStack.pop());
        this.restoreState(this.undoStack[this.undoStack.length - 1]);
        this.updateUndoButton();
    }

    // 恢复之前的状态
    restoreState(state) {
        this.canvas.innerHTML = '';
        state.elements.forEach(el => this.canvas.appendChild(el));
        this.selection = state.selection ? {...state.selection} : null;
        this.selectionRect = this.canvas.querySelector('.selection-rect');
    }

    // 更新撤销按钮状态
    updateUndoButton() {
        this.shadowRoot.getElementById('undoBtn').disabled = this.undoStack.length < 2;
    }

    // 处理键盘快捷键
    handleKeydown(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && document.contains(this)) {
            e.preventDefault();
            this.undo();
        }
    }

    // 在绘图和选择模式之间切换
    toggleMode() {
        this.mode = this.mode === 'draw' ? 'select' : 'draw';
        this.modeIndicator.className = `mode-indicator ${this.mode}-mode`;
        this.modeIndicator.textContent = `${this.mode === 'draw' ? '绘图' : '选区'}模式`;
        this.clearSelection();
    }

    // 处理交互开始
    handleStart(e) {
        this.mode === 'draw' ? this.startDrawingMode(e) : this.startSelection(e);
    }

    // 开始绘图模式
    startDrawingMode(e) {
        if (this.currentTool === 'freehand') {
            this.startFreehand(e);
        } else {
            this.startShapeDrawing(e);
        }
    }

    // 开始自由绘制
    startFreehand(e) {
        const point = this.getCoordinates(e);
        this.currentElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.currentElement.setAttribute("d", `M ${point.x} ${point.y}`);
        Object.assign(this.currentElement.style, {
            fill: 'none',
            stroke: this.colorPicker.value,
            strokeWidth: this.brushSize.value,
            strokeLinecap: 'round'
        });
        this.canvas.appendChild(this.currentElement);
        this.isDrawing = true;
        this.prevPoint = point;
    }

    // 开始绘制预定义形状
    startShapeDrawing(e) {
        const point = this.getCoordinates(e);
        this.startPoint = point;
        
        const shapes = {
            line: () => this.createLineElement(point),
            rect: () => this.createRectElement(),
            circle: () => this.createCircleElement()
        };
        
        this.currentElement = shapes[this.currentTool]();
        this.canvas.appendChild(this.currentElement);
        this.isDrawing = true;
    }

    // 创建 SVG 线条元素
    createLineElement(point) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute('x1', point.x);
        line.setAttribute('y1', point.y);
        line.setAttribute('x2', point.x);
        line.setAttribute('y2', point.y);
        line.style.stroke = this.colorPicker.value;
        line.style.strokeWidth = this.brushSize.value;
        return line;
    }

    // 创建 SVG 矩形元素
    createRectElement() {
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.style.fill = this.colorPicker.value;
        rect.style.stroke = this.colorPicker.value;
        rect.style.strokeWidth = this.brushSize.value;
        return rect;
    }

    // 创建 SVG 圆形元素
    createCircleElement() {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.style.fill = this.colorPicker.value;
        circle.style.stroke = this.colorPicker.value;
        circle.style.strokeWidth = this.brushSize.value;
        return circle;
    }

    // 处理鼠标/触摸移动
    handleMove(e) {
        if (!this.isDrawing) return;
        const point = this.getCoordinates(e);
        
        if (this.currentTool === 'freehand') {
            this.drawFreehand(point);
        } else {
            this.updateShape(point);
        }
    }

    // 绘制自由路径
    drawFreehand(point) {
        const controlPoint = {
            x: (this.prevPoint.x + point.x) / 2,
            y: (this.prevPoint.y + point.y) / 2
        };
        const newPath = `Q ${controlPoint.x} ${controlPoint.y} ${point.x} ${point.y}`;
        this.currentElement.setAttribute("d", this.currentElement.getAttribute("d") + " " + newPath);
        this.prevPoint = point;
    }

    // 更新形状尺寸
    updateShape(point) {
        switch(this.currentTool) {
            case 'line':
                this.currentElement.setAttribute('x2', point.x);
                this.currentElement.setAttribute('y2', point.y);
                break;
            case 'rect':
                this.updateRectDimensions(point);
                break;
            case 'circle':
                this.updateCircleRadius(point);
                break;
        }
    }

    // 更新矩形尺寸
    updateRectDimensions(point) {
        const minX = Math.min(this.startPoint.x, point.x);
        const minY = Math.min(this.startPoint.y, point.y);
        this.currentElement.setAttribute('x', minX);
        this.currentElement.setAttribute('y', minY);
        this.currentElement.setAttribute('width', Math.abs(point.x - this.startPoint.x));
        this.currentElement.setAttribute('height', Math.abs(point.y - this.startPoint.y));
    }

    // 更新圆形半径
    updateCircleRadius(point) {
        const radius = Math.hypot(
            point.x - this.startPoint.x,
            point.y - this.startPoint.y
        );
        this.currentElement.setAttribute('cx', this.startPoint.x);
        this.currentElement.setAttribute('cy', this.startPoint.y);
        this.currentElement.setAttribute('r', radius);
    }

    // 结束绘图动作
    handleEnd() {
        if (!this.isDrawing) return;
        this.finishDrawing();
        this.saveState();
    }

    // 完成绘图过程
    finishDrawing() {
        this.isDrawing = false;
        if (this.currentTool === 'line' && this.isZeroLengthLine()) {
            this.currentElement.remove();
        }
        this.currentElement = null;
    }

    // 检查线条是否长度为零
    isZeroLengthLine() {
        return this.currentElement.tagName === 'line' && 
               this.currentElement.x1.baseVal.value === this.currentElement.x2.baseVal.value &&
               this.currentElement.y1.baseVal.value === this.currentElement.y2.baseVal.value;
    }

    // 将屏幕坐标转换为 SVG 坐标
    getCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.touches?.[0].clientX || e.clientX;
        const clientY = e.touches?.[0].clientY || e.clientY;
        
        return {
            x: (clientX - rect.left) * this.scaleX,
            y: (clientY - rect.top) * this.scaleY
        };
    }

    // 开始选择模式
    startSelection(e) {
        this.clearSelection();
        this.startPoint = this.getCoordinates(e);
        
        this.selectionRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        Object.assign(this.selectionRect.style, {
            stroke: '#2196F3',
            fill: 'rgba(33, 150, 243, 0.2)',
            strokeWidth: '2',
            strokeDasharray: '5,5'
        });
        this.selectionRect.classList.add('selection-rect');
        this.canvas.appendChild(this.selectionRect);

        const updateSelection = e => {
            const current = this.getCoordinates(e);
            const x = Math.min(this.startPoint.x, current.x);
            const y = Math.min(this.startPoint.y, current.y);
            this.selectionRect.setAttribute('x', x);
            this.selectionRect.setAttribute('y', y);
            this.selectionRect.setAttribute('width', Math.abs(current.x - this.startPoint.x));
            this.selectionRect.setAttribute('height', Math.abs(current.y - this.startPoint.y));
        };

        const finish = () => {
            this.canvas.removeEventListener('mousemove', updateSelection);
            this.canvas.removeEventListener('mouseup', finish);
            this.saveSelectionState();
        };

        this.canvas.addEventListener('mousemove', updateSelection);
        this.canvas.addEventListener('mouseup', finish);
    }

    // 保存选择状态
    saveSelectionState() {
        this.selection = {
            x: +this.selectionRect.x.baseVal.value,
            y: +this.selectionRect.y.baseVal.value,
            width: +this.selectionRect.width.baseVal.value,
            height: +this.selectionRect.height.baseVal.value
        };
        
        if (this.selection.width <= 0 || this.selection.height <= 0) {
            this.clearSelection();
        }
        this.saveState();
    }

    // 清空整个画布
    clearCanvas() {
        this.canvas.innerHTML = '';
        this.clearSelection();
        this.saveState();
    }

    // 清除当前选择
    clearSelection() {
        if (this.selectionRect) {
            this.selectionRect.remove();
            this.selection = null;
        }
    }

    // 将画布导出为 SVG 文件
    exportSVG() {
        const clonedSVG = this.canvas.cloneNode(true);
        clonedSVG.querySelector('.selection-rect')?.remove();
        
        clonedSVG.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        
        if (this.selection?.width > 0 && this.selection?.height > 0) {
            const safeX = Math.max(0, this.selection.x);
            const safeY = Math.max(0, this.selection.y);
            const safeWidth = Math.min(this._canvasWidth - safeX, this.selection.width);
            const safeHeight = Math.min(this._canvasHeight - safeY, this.selection.height);
            
            clonedSVG.setAttribute('viewBox', `${safeX} ${safeY} ${safeWidth} ${safeHeight}`);
            clonedSVG.setAttribute('width', safeWidth);
            clonedSVG.setAttribute('height', safeHeight);
        } else {
            clonedSVG.setAttribute('viewBox', `0 0 ${this._canvasWidth} ${this._canvasHeight}`);
            clonedSVG.setAttribute('width', this._canvasWidth);
            clonedSVG.setAttribute('height', this._canvasHeight);
        }
    
        const svgContent = [
            '<?xml version="1.0" standalone="no"?>',
            '<!DOCTYPE svg PUBLIC "-//W3//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">',
            clonedSVG.outerHTML
        ].join('\n');
    
        const blob = new Blob([svgContent], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.selection ? 'selected-area.svg' : 'drawing.svg';
        a.click();
        URL.revokeObjectURL(url);
    }
}

// 注册自定义元素
customElements.define('three-editor', ThreeEditor);
customElements.define('markdown-editor', MarkdownEditor);
customElements.define('svg-exporter', SVGExporter);