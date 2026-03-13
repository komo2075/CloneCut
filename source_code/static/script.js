
// ✅ script.js 最终完整版本
// 含模块三实时保持 + 模块四绿色积木添加保持 + 独立副本逻辑修复 + 详情编辑面板 + 删除按钮管理 + DOM 加载初始化

let brickCount = 0;
const brickArea = document.getElementById("brickArea");
const customNameArea = document.getElementById("customNameArea");
const customInputs = document.getElementById("customInputs");
const modeInput = document.getElementById("mode") || document.createElement("input");
const formatKeys = ["916", "11", "169", "23", "45"];
let customBrickIndex = 1;

let savedCustomPresets = JSON.parse(localStorage.getItem("customPresets") || "{}");
let savedFixedPresets = JSON.parse(localStorage.getItem("fixedPresets") || "[]");
let savedTemplates = JSON.parse(localStorage.getItem("savedTemplates") || "{}");
const liveCustomBlocks = {}; // ✅ 模块三区别名内容实时保存
// CloneCut2.3
const liveTemplateInstances = {}; // ✅ 模块3：每个模板积木实例一份副本（instanceId -> blocks）
//const liveTemplateBlocks = {}; // ✅ 用于保存模块3中每个模板积木的独立副本


//CloneCut2.5,对模板中无法保存区别名数据的修复
// ✅ 模块2 - 全局点击事件，点击外部区域关闭区别名编辑面板
// ✅ 工具：深拷贝，断引用，保证模板是快照
function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

// ✅ 工具：生成唯一 key，专门给 custom 区别名积木用
function newCustomKey() {
  return 'cb_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
}


//CloneCut2.1
// 安全创建按钮，防止事件冒泡
function safeButton(text, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";              // ⭐关键：不是 submit
  btn.textContent = text;
  btn.onclick = (e) => {
    e.preventDefault();             // ⭐阻止表单提交
    e.stopPropagation();            // ⭐阻止事件冒泡
    onClick(e);
  };
  return btn;
}


// ✅ 模块3 - 渲染命名积木序列
// ✅ 模块3 - 渲染命名积木序列（修复模板积木）
// ✅ 模块3 - 渲染命名积木序列（支持模板 & 设置 mode）
function renderBricks() {
  const blocks = [];
  let needsPerSize = false;

  brickArea.querySelectorAll(".brick").forEach(el => {
    const type = el.dataset.type;
    if (type === "fixed") {
      blocks.push(el.querySelector("input").value);
    } else if (type === "size") {
      blocks.push("__SIZE__");
    } else if (type === "custom") {
      const key = el.dataset.key || "";
      blocks.push(`__PER_SIZE__:${key}`);
      needsPerSize = true;

     //CloneCut2.3 
    } else if (type === "template") {
      const templateName = el.dataset.template || el.querySelector("input")?.value?.replace(/（\d+）$/, "");
      const instanceId = el.dataset.instance || "";
      const subBlocks = liveTemplateInstances[instanceId] || JSON.parse(JSON.stringify(savedTemplates[templateName] || []));

      subBlocks.forEach(b => {
        if (b.type === "fixed") blocks.push(b.label);
        else if (b.type === "size") blocks.push("__SIZE__");
        else if (b.type === "custom") {
          const k = b.key || "";                 // ✅ 模板里的 custom 也要有 key
          blocks.push(`__PER_SIZE__:${k}`);
          needsPerSize = true;
        }
      });
    }


  });

  document.getElementById("blockStorage")?.setAttribute("value", blocks.join("||"));
  document.getElementById("mode")?.setAttribute("value", needsPerSize ? "per-size" : "");
}


//CloneCut2.5,修复模板积木中无法保存区别名数据的问题
// ✅ 模块3 - 监听命名积木区的输入变化，实时更新 liveCustomBlocks
//CloneCut2.2,新增模块
// ✅ 模块3 - 区别名面板的 保存/取消 按钮绑定
document.getElementById("saveCustomPreset")?.addEventListener("click", () => {
  const activeKey = customNameArea.dataset.activeKey || "";
  const presetName = (document.getElementById("customPresetName")?.value || "").trim();

  if (!activeKey) {
    alert("No custom brick is currently selected");
    return;
  }
  if (!presetName) {
    alert("Please enter a preset name");
    return;
  }

  // ✅ 读取当前 activeKey 的 per-size 数据
  const data = deepCopy(liveCustomBlocks[activeKey]);

  // ✅ 没数据也允许存，但通常提示一下更友好
  // 如果你希望强制必须有内容，就把这里改成 return
  if (!data || Object.keys(data).length === 0) {
    // alert("当前区别名内容为空，仍然会保存为空预设");
  }

  // ✅ 保存到模块4预设库
  savedCustomPresets[presetName] = data;
  localStorage.setItem("customPresets", JSON.stringify(savedCustomPresets));

  // ✅ 可选, 保存后清空输入框
  document.getElementById("customPresetName").value = "";

  // ✅ 刷新模块4绿色积木列表
  renderCustomModule();
});

document.getElementById("cancelCustomPreset")?.addEventListener("click", () => {
  document.getElementById("customPresetName").value = "";
  // customNameArea.style.display = "none";
});


//CloneCut2.2,function整体替换
// ✅ 模块3 - 显示区别名编辑面板
function showCustomNamePanel(key, initialData = {}) {
  customNameArea.style.display = "block";
  modeInput.value = "per-size";

  // ✅ 记住当前正在编辑哪个区别名积木
  customNameArea.dataset.activeKey = key;

  // ✅ 初始化该 key 的数据容器
  if (!(key in liveCustomBlocks)) {
    liveCustomBlocks[key] = JSON.parse(JSON.stringify(initialData || {}));
  }

  const saved = liveCustomBlocks[key] || {};

  // ✅ 先渲染输入框, 不再用 oninput 字符串
  customInputs.innerHTML = formatKeys.map(k => {
    const v = (saved[k] ?? "");
    return `<div>${k}：<input data-size="${k}" value="${v}"></div>`;
  }).join("");

  // ✅ 为每个输入框绑定 input 事件, 写回对应 key
  customInputs.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", () => {
      const activeKey = customNameArea.dataset.activeKey;
      if (!activeKey) return;
      const data = liveCustomBlocks[activeKey] || {};
      const sizeKey = input.dataset.size;
      data[sizeKey] = input.value; // ✅ 不 trim, 你要空就保持空
      liveCustomBlocks[activeKey] = data;
    });
  });
}


// ✅ 模块3 - 实时更新区别名数据
function updateLiveCustomBlockByKey(key) {
  const inputs = document.querySelectorAll('#customInputs input[name^="custom_name_"]');
  const data = {};
  inputs.forEach(input => {
    const k = input.name.replace("custom_name_", "");
    data[k] = input.value.trim();
  });
  liveCustomBlocks[key] = data;
}

// ✅ 模块3 - 积木移动功能
function moveBrick(el, direction) {
  const parent = el.parentNode;
  const all = Array.from(brickArea.children);
  const index = all.indexOf(parent);
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= all.length) return;
  brickArea.insertBefore(parent, all[newIndex + (direction > 0 ? 1 : 0)]);
  renderBricks();
}

// ✅ 模块3/4 - 模板预览或详情中积木左右移动
function moveTemplateBrick(templateName, index, direction) {
  const arr = savedTemplates[templateName];
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= arr.length) return;
  const [moved] = arr.splice(index, 1);
  arr.splice(newIndex, 0, moved);
  localStorage.setItem("savedTemplates", JSON.stringify(savedTemplates));
  showTemplatePreview(templateName);
}

// ✅ 模块3 - 创建命名积木（包括区别名）
function createEditableBrick(text, type, uniqueKey = null, initialData = {}) {
  const div = document.createElement("div");
  div.className = "brick";
  div.dataset.type = type;

  if (!uniqueKey && type === "custom") {
    uniqueKey = 'cb_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
  }
  if (uniqueKey) div.dataset.key = uniqueKey;

  const input = document.createElement("input");
  input.className = "inline-editor";
  input.value = text;
  input.disabled = true;

  const editIcon = document.createElement("span");
  editIcon.className = "edit-icon";
  editIcon.textContent = "✎";
  editIcon.title = "Click Edit/Finish";
  editIcon.addEventListener("click", () => {
    input.disabled = !input.disabled;
    if (!input.disabled) {
      input.focus();
    } else {
      renderBricks(); // ✅ 编辑完成后刷新命名字段
    }
  });


  //CloneCut2.1
  // 使用安全按钮创建函数
  const left = safeButton("←", () => moveBrick(left, -1));
  const right = safeButton("→", () => moveBrick(right, 1));
  const del = safeButton("×", () => {
    // 1 删除界面上的积木
    div.remove();
    // 2 如果删的是“区别名积木”，顺手清掉它对应的数据
    if (type === "custom" && uniqueKey && liveCustomBlocks[uniqueKey]) {
      delete liveCustomBlocks[uniqueKey];
    }
    // 3 重新渲染命名字段
    renderBricks();
  });


  if (type === "custom") {
    if (!(uniqueKey in liveCustomBlocks)) {
      liveCustomBlocks[uniqueKey] = JSON.parse(JSON.stringify(initialData || {}));
    }

    //CloneCut2.2
    // 点击积木主体时打开区别名编辑面板
    div.addEventListener("click", (e) => {
      if (e.target.tagName === "BUTTON") return;
      if (e.target.classList.contains("edit-icon")) return;
      if (e.target.classList.contains("inline-editor")) return;

      const key = div.dataset.key;
      showCustomNamePanel(key, liveCustomBlocks[key] || {});
    });
  }

  if (type === "template") {
    div.addEventListener("click", () => {
      if (input.disabled) {
        const key = div.dataset.key?.split("（")[0] || text.replace(/（\d+）$/, "");
        showTemplatePreview(key);
      }
    });
  }

  div.appendChild(input);
  div.appendChild(editIcon);
  div.appendChild(left);
  div.appendChild(right);
  div.appendChild(del);
  brickArea.appendChild(div);
  renderBricks();
}

// ✅ 模块3 - 添加不同类型的命名积木
function addBrick(type) {
  if (type === "fixed") {
    createEditableBrick("Example", "fixed");
  } else if (type === "size") {
    const div = document.createElement("div");
    div.className = "brick";
    div.dataset.type = "size";
    div.innerHTML = `<span>Size</span>
      <button type="button" onclick="moveBrick(this, -1)">←</button>
      <button type="button" onclick="moveBrick(this, 1)">→</button>
      <button type="button" onclick="this.parentNode.remove(); renderBricks()">×</button>`;
    brickArea.appendChild(div);
    renderBricks();
  } else if (type === "custom") {
    const existing = Array.from(brickArea.querySelectorAll(".brick"))
      .filter(b => b.dataset.type === "custom")
      .map(b => {
        const text = b.querySelector("input")?.value || "";
        const match = text.match(/^Variant Name(\d+)/);
        return match ? parseInt(match[1]) : null;
      }).filter(n => !isNaN(n));

    const index = findNextAvailableNumber(existing);
    const name = "Variant Name" + index;

    //clonecut2.2
    const uniqueKey = 'cb_' + Date.now() + '_' + Math.floor(Math.random() * 10000);

    liveCustomBlocks[uniqueKey] = {}; // ✅ 添加时初始化空对象
    createEditableBrick(name, "custom", uniqueKey, {});
    showCustomNamePanel(uniqueKey, {});
  }
}

// ✅ 模块3/4 - 获取最小可用编号
function findNextAvailableNumber(numbers) {
  const used = new Set(numbers);
  for (let i = 1; i <= 999; i++) {
    if (!used.has(i)) return i;
  }
  return used.size + 1;
}

// ✅ 模块4 - 从预设添加绿色区别名积木
function addCustomBlockFromPreset(name, data) {
  // 获取已存在的相同名称编号（确保识别如 111（1）、111（2））
  const existing = Array.from(brickArea.querySelectorAll(".brick"))
    .filter(b => b.dataset.type === "custom")
    .map(b => {
      const text = b.querySelector("input")?.value || "";
      const regex = new RegExp(`^${name}（(\\d+)）$`);
      const match = text.match(regex);
      return match ? parseInt(match[1]) : null;
    }).filter(n => !isNaN(n));

  const number = findNextAvailableNumber(existing);
  const displayName = `${name}（${number}）`;

  const localData = JSON.parse(JSON.stringify(data || {}));
  //clonecut2.2
  const uniqueKey = 'cb_' + Date.now() + '_' + Math.floor(Math.random() * 10000);

  liveCustomBlocks[uniqueKey] = localData;

  createEditableBrick(displayName, "custom", uniqueKey, localData);
}

// ✅ 模块4 - 将模板积木添加到模块3中
// ✅ 模块3 - 将蓝色模板积木添加到命名队列
function addTemplateBlockToQueue(templateName) {
  const existing = Array.from(brickArea.querySelectorAll(".brick"))
    .filter(b => b.dataset.type === "template")
    .map(b => {
      const label = b.querySelector("input")?.value;
      const match = label.match(new RegExp(`^${templateName}（(\\d+)）$`));
      return match ? parseInt(match[1]) : null;
    }).filter(n => !isNaN(n));

  const number = findNextAvailableNumber(existing);
  const displayName = `${templateName}（${number}）`;
  
  // CloneCut2.3
  const instanceId = 'tpl_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
  // ✅ 每次添加都用模板原版创建新副本
  

  //CloneCut2.5
  // ✅ 每次添加都用模板原版创建新副本
  const raw = deepCopy(savedTemplates[templateName] || []);

  // ✅ 关键：给模板里的 custom 重新生成 key，并把 customData 写入 liveCustomBlocks
  raw.forEach(b => {
    if (b.type === "custom") {
      const newKey = newCustomKey();
      b.key = newKey;

      // ✅ 把模板保存时的快照写回 liveCustomBlocks
      liveCustomBlocks[newKey] = deepCopy(b.customData || {});
    }
  });


liveTemplateInstances[instanceId] = raw;


  const div = document.createElement("div");
  div.className = "brick";
  div.dataset.type = "template";
  //cloncut2.3
  div.dataset.template = templateName;
  div.dataset.instance = instanceId;//

  const input = document.createElement("input");
  input.className = "inline-editor";
  input.value = displayName;
  input.disabled = true;

  const editIcon = document.createElement("span");
  editIcon.className = "edit-icon";
  editIcon.textContent = "✎";
  editIcon.title = "Click to edit/finish";
  editIcon.addEventListener("click", () => {
    input.disabled = !input.disabled;
    if (!input.disabled) input.focus();
  });

  //CloneCut2.1
  // 使用安全按钮创建函数
  const left = safeButton("←", () => moveBrick(left, -1));
  const right = safeButton("→", () => moveBrick(right, 1));
  const del = safeButton("×", () => {
    div.remove();
    renderBricks();
  });

  //CloneCut2.3
  // 点击积木主体时打开模板预览面板
  div.addEventListener("click", () => {
    if (input.disabled) {
      showTemplatePreviewInstance(instanceId, templateName);
    }
  });
  

  div.appendChild(input);
  div.appendChild(editIcon);
  div.appendChild(left);
  div.appendChild(right);
  div.appendChild(del);
  brickArea.appendChild(div);
  renderBricks();
}

// ✅ 模块4 - 渲染常用名和区别名预设列表
function renderCustomModule() {
  const fixedList = document.getElementById("customFixedList");
  const namedList = document.getElementById("customNamedList");
  fixedList.innerHTML = "";
  namedList.innerHTML = "";

  savedFixedPresets.forEach((name) => {
    const wrap = document.createElement("div");
    wrap.className = "brick";
    wrap.style.background = "orange";
    wrap.innerHTML = `<span>${name}</span>`;
    wrap.onclick = () => createEditableBrick(name, "fixed");
    fixedList.appendChild(wrap);
  });

  Object.entries(savedCustomPresets).forEach(([presetName, values]) => {
    const wrap = document.createElement("div");
    wrap.className = "brick";
    wrap.style.background = "seagreen";
    wrap.style.color = "white";
    wrap.innerHTML = `<span>${presetName}</span>`;
    
    const addBtn = safeButton("Add", (e) => {
      addCustomBlockFromPreset(presetName, values);
    });

    wrap.appendChild(addBtn);
    wrap.onclick = () => showCustomDetailPanel(presetName);
    namedList.appendChild(wrap);
  });
}

// ✅ 模块4 - 渲染模板列表
function renderTemplateList() {
  const list = document.getElementById("templateList");
  list.innerHTML = "";

  Object.keys(savedTemplates).forEach(name => {
    const brick = document.createElement("div");
    brick.className = "brick";
    brick.style.background = "#90c4f5";
    brick.style.color = "black";

    const label = document.createElement("span");
    label.textContent = name;
    brick.appendChild(label);


    //CloneCut2.1
    // 使用安全按钮创建函数
    const addBtn = safeButton("Add", () => {
      addTemplateBlockToQueue(name);
    });
    addBtn.style.marginLeft = "5px";


    brick.appendChild(addBtn);

    brick.onclick = () => {
      showTemplateDetail(name);       // ✅ 打开模块四中的模板详情面板
      // ⚠️ 不再显示模块3预览，防止混淆
    };

    list.appendChild(brick);
  });
}

// ✅ 模块4 - 显示模板详情编辑面板
function showTemplateDetail(name) {
  const detailPanel = document.getElementById("templateDetailPanel");
  const detailTitle = document.getElementById("templateDetailTitle");
  const detailBricks = document.getElementById("templateDetailBricks");
  const editControls = document.getElementById("templateEditControls");

  const bricks = savedTemplates[name] || [];

  detailPanel.style.display = "block";
  detailTitle.innerHTML = `Template Details：${name} <span id="templateDetailEditBtn" class="edit-icon">✎</span>`;
  detailBricks.innerHTML = "";
  editControls.style.display = "none";

  // 非编辑状态渲染：只显示 label
  bricks.forEach(b => {
    const span = document.createElement("div");
    span.className = "brick";
    span.textContent = b.label;
    detailBricks.appendChild(span);
  });

  document.getElementById("templateDetailEditBtn").onclick = () => {
    enterTemplateEditMode(name);
  };
}

function showTemplatePreviewFromInstance(key) {
  const templateData = liveTemplateBlocks[key] || [];
  const area = document.getElementById("templatePreviewArea");
  const title = document.getElementById("templatePreviewTitle");
  const container = document.getElementById("templatePreviewBricks");

  title.textContent = "Template Preview (In Naming Queue): " + key.split("__")[0];
  area.style.display = "block";
  container.innerHTML = "";

  templateData.forEach(b => {
    const span = document.createElement("div");
    span.className = "brick";
    span.textContent = b.label;
    container.appendChild(span);
  });
}


// ✅ 模块4 - 显示区别名详情编辑面板
function showCustomDetailPanel(name) {
  const panel = document.getElementById("customDetailPanel");
  const inputs = document.getElementById("customDetailInputs");
  const title = document.getElementById("customDetailTitle");
  const saveBtn = document.getElementById("saveCustomDetail");
  const cancelBtn = document.getElementById("cancelCustomDetail");

  let editBtn = document.getElementById("customDetailEditBtn");
  if (!editBtn) {
    editBtn = document.createElement("span");
    editBtn.id = "customDetailEditBtn";
    editBtn.textContent = "✎";
    editBtn.className = "edit-icon";
    title.appendChild(editBtn);
  }

  const data = savedCustomPresets[name] || {};
  inputs.innerHTML = formatKeys.map(k =>
    `<div>${k}：<input name="edit_${k}" value="${data[k] || ''}" disabled></div>`
  ).join("");

  title.textContent = "Variant Name Details：" + name + " ";
  title.appendChild(editBtn);

  panel.dataset.preset = name;
  panel.style.display = "block";
  saveBtn.style.display = "none";
  cancelBtn.style.display = "none";
  editBtn.style.display = "inline";

  editBtn.onclick = () => {
    panel.querySelectorAll("input").forEach(input => input.disabled = false);
    saveBtn.style.display = "inline";
    cancelBtn.style.display = "inline";
    editBtn.style.display = "none";
  };

  cancelBtn.onclick = () => showCustomDetailPanel(name);
  saveBtn.onclick = () => saveCustomPreset(name);
}


//CloneCut2.3
// ✅ 模块3 - 显示模板积木的详情预览，并支持编辑 live 副本
function showTemplatePreviewInstance(instanceId, templateName) {
  const panel = document.getElementById("templatePreviewArea");
  const title = document.getElementById("templatePreviewTitle");
  const list = document.getElementById("templatePreviewBricks");

  if (!liveTemplateInstances[instanceId]) {
    liveTemplateInstances[instanceId] = JSON.parse(JSON.stringify(savedTemplates[templateName] || []));
  }

  let tempBlocks = JSON.parse(JSON.stringify(liveTemplateInstances[instanceId]));
  let isEditing = false;

  let editBtn = document.getElementById("previewEditBtn");
  if (!editBtn) {
    editBtn = document.createElement("span");
    editBtn.id = "previewEditBtn";
    editBtn.textContent = "✎";
    editBtn.className = "edit-icon";
    editBtn.style.marginLeft = "6px";
    title.appendChild(editBtn);
  }

  let controlBox = document.getElementById("templatePreviewControls");
  if (!controlBox) {
    controlBox = document.createElement("div");
    controlBox.id = "templatePreviewControls";
    controlBox.style.marginTop = "8px";
    controlBox.innerHTML = `
      <button type="button" id="previewSaveEdit">Save</button>
      <button type="button" id="previewCancelEdit" style="margin-left:6px;">Cancel</button>
    `;
    panel.appendChild(controlBox);
  }

  const saveBtn = document.getElementById("previewSaveEdit");
  const cancelBtn = document.getElementById("previewCancelEdit");

  function render() {
    list.innerHTML = "";
    tempBlocks.forEach((brick, index) => {
      const div = document.createElement("div");
      div.className = "brick";
      div.dataset.type = brick.type;

      const input = document.createElement("input");
      input.className = "inline-editor";
      input.value = brick.label;
      input.disabled = !isEditing;
      input.oninput = () => brick.label = input.value;

      const left = safeButton("←", () => {
        if (index > 0) {
          [tempBlocks[index], tempBlocks[index - 1]] = [tempBlocks[index - 1], tempBlocks[index]];
          render();
        }
      });
      left.disabled = !isEditing;

      const right = safeButton("→", () => {
        if (index < tempBlocks.length - 1) {
          [tempBlocks[index], tempBlocks[index + 1]] = [tempBlocks[index + 1], tempBlocks[index]];
          render();
        }
      });
      right.disabled = !isEditing;

      const del = safeButton("×", () => {
        tempBlocks.splice(index, 1);
        render();
      });
      del.disabled = !isEditing;

      div.appendChild(input);
      div.appendChild(left);
      div.appendChild(right);
      div.appendChild(del);
      list.appendChild(div);
    });
  }

  editBtn.onclick = () => {
    isEditing = !isEditing;
    controlBox.style.display = isEditing ? "block" : "none";
    render();
  };

  saveBtn.onclick = () => {
    // ✅ 只写回该实例
    liveTemplateInstances[instanceId] = JSON.parse(JSON.stringify(tempBlocks));
    isEditing = false;
    controlBox.style.display = "none";
    render();
    renderBricks(); // ✅ 同步命名序列
  };

  cancelBtn.onclick = () => {
    tempBlocks = JSON.parse(JSON.stringify(liveTemplateInstances[instanceId]));
    isEditing = false;
    controlBox.style.display = "none";
    render();
  };

  title.textContent = " Template Structure Preview：" + templateName + "（Queue Instance）";
  title.appendChild(editBtn);
  render();
  panel.style.display = "block";
}


// 模块3的模板预览区域
// ✅ 模块3/4 - 模板预览或详情中积木左右移动
function moveTemplateBrick(templateName, index, direction) {
  const arr = savedTemplates[templateName];
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= arr.length) return;

  const [moved] = arr.splice(index, 1);
  arr.splice(newIndex, 0, moved);

  localStorage.setItem("savedTemplates", JSON.stringify(savedTemplates));
  showTemplatePreview(templateName);
}

// ✅ 模块4 - 显示模板详情编辑面板
function showTemplateDetail(name) {
  const panel = document.getElementById("templateDetailPanel");
  const title = document.getElementById("templateDetailTitle");
  const brickList = document.getElementById("templateDetailBricks");
  const editControls = document.getElementById("templateEditControls");

  panel.style.display = "block";
  title.textContent = "Template Details：" + name;
  brickList.innerHTML = "";

  const blocks = savedTemplates[name] || [];

  // 显示为静态积木（无按钮）
  blocks.forEach(b => {
    const div = document.createElement("div");
    div.className = "brick";
    div.dataset.type = b.type;
    div.dataset.key = b.key || '';
    div.innerHTML = `<input class="inline-editor" value="${b.label}" disabled>`;
    brickList.appendChild(div);
  });

  // 按钮控制
  const editBtn = document.createElement("span");
  editBtn.textContent = "✎";
  editBtn.className = "edit-icon";
  editBtn.style.marginLeft = "8px";
  editBtn.style.cursor = "pointer";
  title.appendChild(editBtn);

  editBtn.onclick = () => {
    // 启动编辑模式：替换为可编辑积木（带移动/删除）
    brickList.innerHTML = "";
    blocks.forEach(b => {
      const uniqueKey = b.key || ('template_' + Date.now() + '_' + Math.floor(Math.random() * 10000));
      const initData = liveCustomBlocks[uniqueKey] || {};
      createEditableBrick(b.label, b.type, uniqueKey, initData);
    });

    // 插入到 templateDetailBricks 中
    const newBricks = document.querySelectorAll("#brickArea .brick");
    const fragment = document.createDocumentFragment();
    newBricks.forEach(b => fragment.appendChild(b));
    brickList.appendChild(fragment);

    editControls.style.display = "block";
    panel.dataset.editing = name;
  };
}

function enableTemplateEditMode(name) {
  const panel = document.getElementById("templateDetailPanel");
  const brickList = document.getElementById("templateDetailBricks");
  const controls = document.getElementById("templateEditControls");
  const originalData = JSON.stringify(savedTemplates[name] || []);

  controls.style.display = "block";
  brickList.innerHTML = "";

  (savedTemplates[name] || []).forEach((brick, index) => {
    const div = document.createElement("div");
    div.className = "brick";
    div.dataset.type = brick.type;

    const input = document.createElement("input");
    input.className = "inline-editor";
    input.value = brick.label;
    input.disabled = false;

    const editIcon = document.createElement("span");
    editIcon.className = "edit-icon";
    editIcon.textContent = "✎";
    editIcon.title = "Click to edit/finish";

    //CloneCut2.1
    // 使用安全按钮创建函数
    const left = safeButton("←", () => moveTemplateBrick(div, -1));
    const right = safeButton("→", () => moveTemplateBrick(div, 1));
    const del = safeButton("×", () => div.remove());

    div.appendChild(input);
    div.appendChild(editIcon);
    div.appendChild(left);
    div.appendChild(right);
    div.appendChild(del);
    brickList.appendChild(div);
  });

  document.getElementById("saveTemplateEdit").onclick = () => {
    const newBricks = [];
    brickList.querySelectorAll(".brick").forEach(div => {
      const type = div.dataset.type;
      const label = div.querySelector("input")?.value?.trim() || "";
      newBricks.push({ type, label });
    });
    savedTemplates[name] = newBricks;
    localStorage.setItem("savedTemplates", JSON.stringify(savedTemplates));
    showTemplateDetail(name);
    renderTemplateList();
  };

  document.getElementById("cancelTemplateEdit").onclick = () => {
    savedTemplates[name] = JSON.parse(originalData);
    showTemplateDetail(name);
  };
}

//模块4的模板详情编辑面板
// ✅ 模块3/4 - 模板预览或详情中积木左右移动
function moveTemplateBrick(el, direction) {
  const list = document.getElementById("templateDetailBricks");
  const items = Array.from(list.children);
  const index = items.indexOf(el);
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= items.length) return;
  list.insertBefore(el, direction > 0 ? items[newIndex].nextSibling : items[newIndex]);
}

// ✅ 模块4 - 保存区别名预设
function saveCustomPreset(name) {
  const panel = document.getElementById("customDetailPanel");
  const inputs = panel.querySelectorAll("input[name^='edit_']");
  const newData = {};
  inputs.forEach(input => {
    const key = input.name.replace("edit_", "");
    newData[key] = input.value.trim();
  });
  savedCustomPresets[name] = newData;
  localStorage.setItem("customPresets", JSON.stringify(savedCustomPresets));
  showCustomDetailPanel(name);
  renderCustomModule();
}


//CloneCut2.2,新增
// ✅ 模块2 - 同步区别名数据到表单隐藏字段
function syncCustomHiddenInputs(form) {
  // 清掉旧的隐藏字段
  form.querySelectorAll("input.hidden-custom").forEach(el => el.remove());

  // 把 liveCustomBlocks 写进 form
  Object.entries(liveCustomBlocks).forEach(([key, data]) => {
    formatKeys.forEach(size => {
      const inp = document.createElement("input");
      inp.type = "hidden";
      inp.className = "hidden-custom";
      inp.name = `customblock_${key}_${size}`;
      inp.value = (data && data[size] != null) ? String(data[size]) : "";
      form.appendChild(inp);
    });
  });
}


document.addEventListener("DOMContentLoaded", () => {
  renderCustomModule();
  renderBricks();

  // 按钮绑定确保在 DOM 完全加载后执行
  document.getElementById("addFixed")?.addEventListener("click", () => addBrick("fixed"));
  document.getElementById("addSize")?.addEventListener("click", () => addBrick("size"));
  document.getElementById("addCustom")?.addEventListener("click", () => addBrick("custom"));

  document.getElementById("showPreset")?.addEventListener("click", () => {
    const name = prompt("Enter Common Name：");
    if (!name) return;
    if (!savedFixedPresets.includes(name)) {
      savedFixedPresets.push(name);
      localStorage.setItem("fixedPresets", JSON.stringify(savedFixedPresets));
      renderCustomModule();
    }
    createEditableBrick(name, "fixed");
  });

 document.getElementById("toggleEditMode")?.addEventListener("click", () => {
  const isActive = document.body.classList.toggle("custom-edit-mode");
  const fixedList = document.getElementById("customFixedList").children;
  const namedList = document.getElementById("customNamedList").children;
  const templateList = document.getElementById("templateList").children;

  [...fixedList, ...namedList, ...templateList].forEach(brick => {
    let delBtn = brick.querySelector(".delete-confirm");
    if (!delBtn) {
      delBtn = document.createElement("button");
      delBtn.className = "delete-confirm";
      delBtn.textContent = "×";
      delBtn.style.marginLeft = "8px";
      delBtn.style.background = "#e74c3c";
      delBtn.style.color = "white";
      delBtn.style.border = "none";
      delBtn.style.borderRadius = "4px";
      delBtn.style.cursor = "pointer";
      delBtn.onclick = (e) => {
        e.stopPropagation();

        let name = "";
        const span = brick.querySelector("span");
        if (span) {
          name = span.textContent?.replace(/（\d+）$/, "");
        } else {
          const input = brick.querySelector("input");
          name = input?.value?.replace(/（\d+）$/, "") || "";
        }

        const confirmBox = confirm("Are you sure you want to delete this preset?");
        if (confirmBox) {
          delete savedCustomPresets[name];
          savedFixedPresets = savedFixedPresets.filter(n => n !== name);
          delete savedTemplates[name];
          localStorage.setItem("customPresets", JSON.stringify(savedCustomPresets));
          localStorage.setItem("fixedPresets", JSON.stringify(savedFixedPresets));
          localStorage.setItem("savedTemplates", JSON.stringify(savedTemplates));
          brick.remove();
        }
      };
      brick.appendChild(delBtn);
    }
    delBtn.style.display = isActive ? 'inline-block' : 'none';
  });
});

  document.getElementById("saveTemplateBtn")?.addEventListener("click", () => {
    const name = document.getElementById("templateSaveName").value.trim();
    if (!name) return alert("Please enter a template name");


    // CloneCut2.5
    //✅ 模板名称不能重复
    const bricks = [];

    // ✅ 把队列里的积木转成模板快照
    Array.from(document.querySelectorAll("#brickArea .brick")).forEach(el => {

      const type = el.dataset.type;

      // 1 固定名积木
      if (type === "fixed") {
        const label = el.querySelector("input")?.value || "";
        bricks.push({
          type: "fixed",
          label: label
        });
        return;
      }

      // 2 尺寸积木
      if (type === "size") {
        bricks.push({
          type: "size",
          label: "__SIZE__"
        });
        return;
      }

      // 3 区别名积木 custom
      if (type === "custom") {

        let key = el.dataset.key || "";

        // 如果没有 key 就生成一个
        if (!key) {
          key = 'cb_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        }

        const label = el.querySelector("input")?.value || "";

        bricks.push({
          type: "custom",
          key: key,
          label: label,

          // ⭐ 关键：把当时的 per-size 文本存进模板
          customData: JSON.parse(JSON.stringify(liveCustomBlocks[key] || {}))
        });

        return;
      }

      // 4 蓝色模板积木
      if (type === "template") {

        const templateName = el.dataset.template || "";
        const instanceId = el.dataset.instance || "";

        const subBlocks = liveTemplateInstances[instanceId]
          ? JSON.parse(JSON.stringify(liveTemplateInstances[instanceId]))
          : JSON.parse(JSON.stringify(savedTemplates[templateName] || []));

        subBlocks.forEach(b => {
          bricks.push(JSON.parse(JSON.stringify(b)));
        });

        return;
      }

      // 兜底
      const label = el.querySelector("input")?.value || el.textContent.trim();

      bricks.push({
        type: type,
        label: label
      });

    });



    savedTemplates[name] = bricks;
    localStorage.setItem("savedTemplates", JSON.stringify(savedTemplates));
    renderTemplateList();
    alert("Template saved successfully!");
  });
  // 其余按钮同样按需绑定
  renderTemplateList();


  //CloneCut2.1
  // 模块2 - 处理表单提交和下载
  const form = document.getElementById("mainForm");
  const warnEl = document.getElementById("warn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // ✅ 阻止页面跳转

    warnEl.textContent = ""; // 清空旧提示

    //clonecut2.2
    // 提交前同步区别名数据到隐藏字段
    syncCustomHiddenInputs(form);
    const fd = new FormData(form);


    try {
      const resp = await fetch("/convert", {
        method: "POST",
        body: fd
      });

      const data = await resp.json();

      // ✅ 红字提示
      if (data.warnings && data.warnings.length > 0) {
        warnEl.textContent = data.warnings.join("\n");
      }

      // ✅ 不阻止下载：只要 ok=true 就下载
      if (data.ok && data.download_url) {
        window.location.href = data.download_url; // 直接触发浏览器下载
      }
    } catch (err) {
      warnEl.textContent = "Request failed. Please check if the backend server is running, or refresh the page and try again.";
    }
  });
});


// ✅ 模块4 - 显示模板详情编辑面板
function showTemplateDetail(templateName) {
  const panel = document.getElementById("templateDetailPanel");
  const title = document.getElementById("templateDetailTitle");
  const brickList = document.getElementById("templateDetailBricks");
  const controlPanel = document.getElementById("templateEditControls");

  const data = savedTemplates[templateName] || [];
  panel.style.display = "block";
  controlPanel.style.display = "none";
  brickList.innerHTML = "";
  title.innerHTML = `Template Details：${templateName} <span class="edit-icon" id="templateDetailEditBtn">✎</span>`;

  // 渲染积木
  data.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "brick";
    div.dataset.index = idx;
    div.dataset.type = item.type;

    const input = document.createElement("input");
    input.className = "inline-editor";
    input.value = item.label;
    input.disabled = true;

    div.appendChild(input);
    brickList.appendChild(div);
  });

  // 编辑按钮绑定
  document.getElementById("templateDetailEditBtn").onclick = () => {
    const items = brickList.querySelectorAll(".brick");
    items.forEach((div, idx) => {
      const input = div.querySelector("input");
      input.disabled = false;

      // 左右移动
      const left = safeButton("←", () => {
        if (idx > 0) {
          const prev = brickList.children[idx - 1];
          brickList.insertBefore(div, prev);
        }
      });
      div.appendChild(left);

      const right = safeButton("→", () => {
        if (idx < brickList.children.length - 1) {
          const next = brickList.children[idx + 1];
          brickList.insertBefore(next, div);
        }
      });
      div.appendChild(right);

      // 删除
      const del = safeButton("×", () => { div.remove();
      div.appendChild(del);
      });
    });

    controlPanel.style.display = "block";
  };

  // 保存编辑
  document.getElementById("saveTemplateEdit").onclick = () => {
    const items = brickList.querySelectorAll(".brick");
    const updated = Array.from(items).map(div => {
      return {
        type: div.dataset.type,
        label: div.querySelector("input").value.trim(),
        key: div.dataset.key || ''
      };
    });
    savedTemplates[templateName] = updated;
    localStorage.setItem("savedTemplates", JSON.stringify(savedTemplates));
    alert("Template updated successfully!");
    showTemplateDetail(templateName); // 重新加载为非编辑状态
  };

  // 取消编辑
  document.getElementById("cancelTemplateEdit").onclick = () => {
    showTemplateDetail(templateName); // 还原展示
  };
}

function showTemplatePreviewFromQueueBlock(name) {
  const data = savedTemplates[name];
  const container = document.getElementById("templatePreviewArea");
  const list = document.getElementById("templatePreviewBricks");

  if (!data || !Array.isArray(data)) {
    container.style.display = "none";
    return;
  }

  list.innerHTML = "";
  data.forEach(item => {
    const div = document.createElement("div");
    div.className = "brick";
    div.textContent = item.label;
    list.appendChild(div);
  });

  container.style.display = "block";
}
function showTemplatePreviewInQueue(templateName) {
  const area = document.getElementById("templatePreviewArea");
  const container = document.getElementById("templatePreviewBricks");
  const bricks = savedTemplates[templateName] || [];

  area.style.display = "block";
  document.getElementById("templatePreviewTitle").textContent = `Template Preview：${templateName}`;
  container.innerHTML = "";

  bricks.forEach((brick, index) => {
    const div = document.createElement("div");
    div.className = "brick";
    div.dataset.type = brick.type;

    const input = document.createElement("input");
    input.className = "inline-editor";
    input.value = brick.label;
    input.disabled = false;

    const editIcon = document.createElement("span");
    editIcon.className = "edit-icon";
    editIcon.textContent = "✎";
    editIcon.title = "Click to edit/finish";

    
    //CloneCut2.1
    // 使用安全按钮创建函数
    const left = safeButton("←", () => { moveTemplateBrick(div, -1); });
    const right = safeButton("→", () => { moveTemplateBrick(div, 1); });
    const del = safeButton("×", () => { div.remove(); });
    

    div.appendChild(input);
    div.appendChild(editIcon);
    div.appendChild(left);
    div.appendChild(right);
    div.appendChild(del);
    container.appendChild(div);
  });
}


