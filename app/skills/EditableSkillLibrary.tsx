"use client";

import { useEffect, useMemo, useState } from "react";

type SkillItem = {
  slug: string;
  name: string;
  scene: string;
  status: string;
  value: string;
  tags?: string[];
};

type SkillDraft = {
  name: string;
  tags: string[];
};

type FolderState = {
  folders: string[];
  assignments: Record<string, string>;
  trashed: string[];
};

type EditableSkillLibraryProps = {
  detailSlugs: string[];
  skills: SkillItem[];
};

const editsStorageKey = "personal-os-skill-library-edits-v1";
const foldersStorageKey = "personal-os-skill-folders-v1";
const inboxFolder = "未分类";
const trashFolder = "回收站";
const emptyFolderState: FolderState = { folders: [], assignments: {}, trashed: [] };

function parseTags(value: string) {
  return value
    .split(/[、,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeFolderName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function shouldIgnoreDrag(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("input, select, textarea, a, button"));
}

function readSavedDrafts() {
  try {
    const savedDrafts = window.localStorage.getItem(editsStorageKey);
    return savedDrafts ? (JSON.parse(savedDrafts) as Record<string, SkillDraft>) : {};
  } catch {
    return {};
  }
}

function readSavedFolderState(): FolderState {
  try {
    const savedFolders = window.localStorage.getItem(foldersStorageKey);
    if (!savedFolders) return emptyFolderState;
    const parsed = JSON.parse(savedFolders) as Partial<FolderState>;
    return {
      folders: parsed.folders ?? [],
      assignments: parsed.assignments ?? {},
      trashed: parsed.trashed ?? [],
    };
  } catch {
    return emptyFolderState;
  }
}

export function EditableSkillLibrary({ detailSlugs, skills }: EditableSkillLibraryProps) {
  const detailSet = useMemo(() => new Set(detailSlugs), [detailSlugs]);
  const [drafts, setDrafts] = useState<Record<string, SkillDraft>>({});
  const [folderState, setFolderState] = useState<FolderState>(emptyFolderState);
  const [hasLoadedLocalState, setHasLoadedLocalState] = useState(false);
  const [activeFolder, setActiveFolder] = useState("全部");
  const [newFolderName, setNewFolderName] = useState("");
  const [draggingSlug, setDraggingSlug] = useState<string | null>(null);
  const [dropTargetFolder, setDropTargetFolder] = useState<string | null>(null);

  useEffect(() => {
    const loadSavedState = window.setTimeout(() => {
      setDrafts(readSavedDrafts());
      setFolderState(readSavedFolderState());
      setHasLoadedLocalState(true);
    }, 0);

    return () => window.clearTimeout(loadSavedState);
  }, []);

  useEffect(() => {
    if (!hasLoadedLocalState) return;
    window.localStorage.setItem(editsStorageKey, JSON.stringify(drafts));
  }, [drafts, hasLoadedLocalState]);

  useEffect(() => {
    if (!hasLoadedLocalState) return;
    window.localStorage.setItem(foldersStorageKey, JSON.stringify(folderState));
  }, [folderState, hasLoadedLocalState]);

  const folderTabs = ["全部", inboxFolder, ...folderState.folders, trashFolder];
  const trashedSet = useMemo(() => new Set(folderState.trashed), [folderState.trashed]);
  const visibleSkills = skills.filter((skill) => {
    const isTrashed = trashedSet.has(skill.slug);
    if (activeFolder === trashFolder) return isTrashed;
    if (isTrashed) return false;
    if (activeFolder === "全部") return true;
    const assignedFolder = folderState.assignments[skill.slug] ?? inboxFolder;
    return assignedFolder === activeFolder;
  });

  function updateName(slug: string, name: string) {
    setDrafts((current) => ({
      ...current,
      [slug]: {
        name,
        tags: current[slug]?.tags ?? skills.find((skill) => skill.slug === slug)?.tags ?? [],
      },
    }));
  }

  function updateTags(slug: string, tagsText: string) {
    setDrafts((current) => ({
      ...current,
      [slug]: {
        name: current[slug]?.name ?? skills.find((skill) => skill.slug === slug)?.name ?? "",
        tags: parseTags(tagsText),
      },
    }));
  }

  function createFolder() {
    const folderName = normalizeFolderName(newFolderName);
    const isReservedFolder = folderName === "全部" || folderName === inboxFolder || folderName === trashFolder;
    if (!folderName || isReservedFolder || folderState.folders.includes(folderName)) return;

    setFolderState((current) => ({ ...current, folders: [...current.folders, folderName] }));
    setActiveFolder(folderName);
    setNewFolderName("");
  }

  function assignFolder(slug: string, folderName: string) {
    setFolderState((current) => ({
      ...current,
      assignments: {
        ...current.assignments,
        [slug]: folderName,
      },
      trashed: current.trashed.filter((item) => item !== slug),
    }));
  }

  function moveToTrash(slug: string) {
    setFolderState((current) => ({
      ...current,
      trashed: current.trashed.includes(slug) ? current.trashed : [...current.trashed, slug],
    }));
  }

  function restoreFromTrash(slug: string) {
    const restoredFolder = folderState.assignments[slug] ?? inboxFolder;
    setFolderState((current) => ({
      ...current,
      trashed: current.trashed.filter((item) => item !== slug),
    }));
    setActiveFolder(restoredFolder);
  }

  function dropIntoFolder(folderName: string) {
    if (!draggingSlug || folderName === "全部") return;
    if (folderName === trashFolder) {
      moveToTrash(draggingSlug);
    } else {
      assignFolder(draggingSlug, folderName);
    }
    setActiveFolder(folderName);
    setDraggingSlug(null);
    setDropTargetFolder(null);
  }

  return (
    <>
      <div className="folder-tools" aria-label="收录文件夹">
        <div className="folder-tabs">
          {folderTabs.map((folder) => {
            const canDrop = folder !== "全部";
            return (
              <button
                className={[
                  "folder-tab",
                  folder === activeFolder ? "active" : "",
                  canDrop ? "droppable" : "",
                  folder === trashFolder ? "trash-tab" : "",
                  folder === dropTargetFolder ? "drop-target" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={folder}
                type="button"
                onClick={() => setActiveFolder(folder)}
                onDragOver={(event) => {
                  if (!canDrop || !draggingSlug) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDropTargetFolder(folder);
                }}
                onDragLeave={() => {
                  if (dropTargetFolder === folder) setDropTargetFolder(null);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  dropIntoFolder(folder);
                }}
              >
                {folder}
              </button>
            );
          })}
        </div>
        <div className="folder-create">
          <label className="sr-only" htmlFor="new-skill-folder">
            新建文件夹
          </label>
          <input
            id="new-skill-folder"
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") createFolder();
            }}
            placeholder="新建文件夹"
          />
          <button type="button" onClick={createFolder}>
            新建
          </button>
        </div>
      </div>

      <div className="skill-table editable-skill-table">
        {visibleSkills.map((skill) => {
          const draft = drafts[skill.slug];
          const name = draft?.name ?? skill.name;
          const tags = draft?.tags ?? skill.tags ?? [];
          const hasDetail = detailSet.has(skill.slug);
          const currentFolder = folderState.assignments[skill.slug] ?? inboxFolder;
          const isTrashed = trashedSet.has(skill.slug);

          return (
            <div
              className={draggingSlug === skill.slug ? "skill-row editable-row dragging" : "skill-row editable-row"}
              role="row"
              tabIndex={0}
              key={skill.slug}
              draggable={!isTrashed}
              onDragStart={(event) => {
                if (isTrashed || shouldIgnoreDrag(event.target)) {
                  event.preventDefault();
                  return;
                }
                setDraggingSlug(skill.slug);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", skill.slug);
              }}
              onDragEnd={() => {
                setDraggingSlug(null);
                setDropTargetFolder(null);
              }}
            >
              <div className="editable-main">
                <label className="sr-only" htmlFor={`skill-title-${skill.slug}`}>
                  标题
                </label>
                <input
                  id={`skill-title-${skill.slug}`}
                  className="editable-title"
                  value={name}
                  onChange={(event) => updateName(skill.slug, event.target.value)}
                  aria-label={`${skill.name} 的标题`}
                />
                <div className="skill-reveal">
                  <p>{skill.value}</p>
                  <label className="tag-edit-label" htmlFor={`skill-tags-${skill.slug}`}>
                    标签
                  </label>
                  <input
                    id={`skill-tags-${skill.slug}`}
                    className="editable-tags"
                    value={tags.join("、")}
                    onChange={(event) => updateTags(skill.slug, event.target.value)}
                    placeholder="用顿号或逗号分隔标签"
                    aria-label={`${skill.name} 的标签`}
                  />
                  <label className="tag-edit-label" htmlFor={`skill-folder-${skill.slug}`}>
                    文件夹
                  </label>
                  <select
                    id={`skill-folder-${skill.slug}`}
                    className="folder-select"
                    value={currentFolder}
                    onChange={(event) => assignFolder(skill.slug, event.target.value)}
                    aria-label={`${skill.name} 的文件夹`}
                    disabled={isTrashed}
                  >
                    <option value={inboxFolder}>{inboxFolder}</option>
                    {folderState.folders.map((folder) => (
                      <option value={folder} key={folder}>
                        {folder}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <span>{isTrashed ? trashFolder : skill.scene}</span>
              {isTrashed ? (
                <button className="restore-button" type="button" onClick={() => restoreFromTrash(skill.slug)}>
                  恢复
                </button>
              ) : hasDetail ? (
                <a className="view-link" href={`/skills/${skill.slug}`}>
                  查看全文
                </a>
              ) : (
                <em>{skill.status}</em>
              )}
              {!isTrashed ? (
                <button
                  className="trash-button"
                  type="button"
                  onClick={() => moveToTrash(skill.slug)}
                  aria-label={`移入回收站：${name}`}
                >
                  <span aria-hidden="true" />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}


