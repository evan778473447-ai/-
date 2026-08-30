const storageKey = "my-todo-list-date-groups";
const form = document.querySelector("#task-form");
const dateInput = document.querySelector("#date-input");
const input = document.querySelector("#task-input");
const groupsElement = document.querySelector("#date-groups");
const emptyState = document.querySelector("#empty-state");
const summary = document.querySelector("#task-summary");
const clearCompletedButton = document.querySelector("#clear-completed");

let groups = loadGroups();
dateInput.value = today();

function today() {
  const date = new Date();
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
}

function loadGroups() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved)) return saved;
    const legacyTasks = JSON.parse(localStorage.getItem("my-todo-list-tasks"));
    return Array.isArray(legacyTasks) && legacyTasks.length ? [{ date: today(), tasks: legacyTasks }] : [];
  } catch {
    return [];
  }
}

function saveGroups() {
  localStorage.setItem(storageKey, JSON.stringify(groups));
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`;
}

function render() {
  groupsElement.replaceChildren();
  const allTasks = groups.flatMap((group) => group.tasks);
  const completedCount = allTasks.filter((task) => task.completed).length;
  const remaining = allTasks.length - completedCount;
  summary.textContent = allTasks.length === 0 ? "准备开始吧" : `还有 ${remaining} 项待完成`;
  emptyState.hidden = allTasks.length > 0;
  clearCompletedButton.style.display = completedCount ? "inline-block" : "none";

  groups.sort((a, b) => a.date.localeCompare(b.date)).forEach((group) => {
    const section = document.createElement("section");
    section.className = "date-group";
    const header = document.createElement("div");
    header.className = "date-header";
    const title = document.createElement("h2");
    title.textContent = formatDate(group.date);
    const editDate = document.createElement("button");
    editDate.className = "text-button";
    editDate.type = "button";
    editDate.textContent = "修改日期";
    editDate.addEventListener("click", () => changeDate(group));
    const deleteGroup = document.createElement("button");
    deleteGroup.className = "delete-button";
    deleteGroup.type = "button";
    deleteGroup.textContent = "删除日期";
    deleteGroup.addEventListener("click", () => {
      if (confirm(`删除 ${formatDate(group.date)} 及其全部待办？`)) {
        groups = groups.filter((currentGroup) => currentGroup !== group);
        saveGroups();
        render();
      }
    });
    header.append(title, editDate, deleteGroup);
    const list = document.createElement("ul");
    list.className = "task-list";
    group.tasks.forEach((task) => {
      const item = document.createElement("li");
      item.className = `task-item${task.completed ? " completed" : ""}`;
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = task.completed;
      checkbox.setAttribute("aria-label", `完成任务：${task.text}`);
      checkbox.addEventListener("change", () => {
        task.completed = checkbox.checked;
        saveGroups();
        render();
      });
      const text = document.createElement("span");
      text.className = "task-text";
      text.textContent = task.text;
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "text-button";
      edit.textContent = "修改";
      edit.addEventListener("click", () => {
        const updatedText = prompt("修改待办内容：", task.text);
        if (updatedText?.trim()) {
          task.text = updatedText.trim();
          saveGroups();
          render();
        }
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "delete-button";
      remove.textContent = "删除";
      remove.addEventListener("click", () => {
        group.tasks = group.tasks.filter((currentTask) => currentTask.id !== task.id);
        if (group.tasks.length === 0) groups = groups.filter((currentGroup) => currentGroup !== group);
        saveGroups();
        render();
      });
      item.append(checkbox, text, edit, remove);
      list.append(item);
    });
    section.append(header, list);
    groupsElement.append(section);
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  let group = groups.find((currentGroup) => currentGroup.date === dateInput.value);
  if (!group) {
    group = { date: dateInput.value, tasks: [] };
    groups.push(group);
  }
  group.tasks.unshift({ id: crypto.randomUUID(), text, completed: false });
  saveGroups();
  input.value = "";
  input.focus();
  render();
});

function changeDate(group) {
  const updatedDate = prompt("请输入新日期（YYYY-MM-DD）：", group.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(updatedDate || "")) return;
  const existingGroup = groups.find((currentGroup) => currentGroup !== group && currentGroup.date === updatedDate);
  if (existingGroup) {
    existingGroup.tasks.push(...group.tasks);
    groups = groups.filter((currentGroup) => currentGroup !== group);
  } else {
    group.date = updatedDate;
  }
  saveGroups();
  render();
}

clearCompletedButton.addEventListener("click", () => {
  groups = groups.map((group) => ({ ...group, tasks: group.tasks.filter((task) => !task.completed) })).filter((group) => group.tasks.length);
  saveGroups();
  render();
});

render();
