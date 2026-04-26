"use client";

import { useEffect, useState } from "react";

type DraftAutosaveProps = {
  formId: string;
  storageKey: string;
};

type DraftValue = Record<string, string[]>;

const debounceMs = 1200;

export function DraftAutosave({ formId, storageKey }: DraftAutosaveProps) {
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    setHasSavedDraft(Boolean(localStorage.getItem(storageKey)));
    let timer: number | undefined;

    const save = () => {
      const draft = serializeForm(form);
      localStorage.setItem(storageKey, JSON.stringify(draft));
      setHasSavedDraft(true);
      setSavedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
    };

    const scheduleSave = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(save, debounceMs);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        save();
      }
    };

    const clearDraft = () => {
      localStorage.removeItem(storageKey);
    };

    form.addEventListener("input", scheduleSave);
    form.addEventListener("change", scheduleSave);
    form.addEventListener("submit", clearDraft);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      form.removeEventListener("input", scheduleSave);
      form.removeEventListener("change", scheduleSave);
      form.removeEventListener("submit", clearDraft);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [formId, storageKey]);

  return (
    <div className="autosave-panel" aria-live="polite">
      <p className="hint">
        자동 임시저장이 켜져 있습니다. <kbd>Ctrl</kbd> + <kbd>S</kbd>로 즉시 저장할 수 있습니다.
        {savedAt ? ` 마지막 저장: ${savedAt}` : ""}
      </p>
      {hasSavedDraft ? (
        <div className="actions-row">
          <button className="button-secondary" type="button" onClick={restoreDraft}>
            임시저장 복구
          </button>
          <button className="button-secondary" type="button" onClick={clearDraft}>
            임시저장 지우기
          </button>
        </div>
      ) : null}
    </div>
  );

  function restoreDraft() {
    const form = document.getElementById(formId);
    const raw = localStorage.getItem(storageKey);
    if (!(form instanceof HTMLFormElement) || !raw) {
      return;
    }

    try {
      const draft = JSON.parse(raw) as DraftValue;
      restoreForm(form, draft);
    } catch {
      clearDraft();
    }
  }

  function clearDraft() {
    localStorage.removeItem(storageKey);
    setHasSavedDraft(false);
    setSavedAt("");
  }
}

function serializeForm(form: HTMLFormElement): DraftValue {
  const formData = new FormData(form);
  const draft: DraftValue = {};

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      continue;
    }

    draft[key] = [...(draft[key] ?? []), value.toString()];
  }

  return draft;
}

function restoreForm(form: HTMLFormElement, draft: DraftValue) {
  Object.entries(draft).forEach(([name, values]) => {
    const fields = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${name}"]`);

    fields.forEach((field) => {
      if (field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")) {
        field.checked = values.includes(field.value);
      } else {
        field.value = values[0] ?? "";
      }

      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });
}
