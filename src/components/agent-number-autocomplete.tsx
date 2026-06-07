"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const PORTAL_ROOT_ID = "agent-number-autocomplete-portal-root";

export type AgentNumberAutocompleteProps = {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

/** Digits-only key for prefix matching (handles spaces, formatting). */
function digitsOnly(value: string): string {
  return value.normalize("NFKC").replace(/\D/g, "");
}

function getPortalContainer(): HTMLElement | null {
  if (typeof document === "undefined") {
    return null;
  }

  let root = document.getElementById(PORTAL_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = PORTAL_ROOT_ID;
    root.setAttribute("data-agent-autocomplete-portal", "true");
    document.body.appendChild(root);
  }

  return root;
}

export function AgentNumberAutocomplete({
  options,
  value,
  onChange,
  placeholder = "בחירה לפי סוכן / מספר סוכן",
  ariaLabel = "חיפוש לפי מספר סוכן",
}: AgentNumberAutocompleteProps) {
  const [searchText, setSearchText] = useState("");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();
  const committedValueRef = useRef(value);

  const normalizedOptions = useMemo(
    () =>
      Array.from(
        new Set(
          options
            .map((agentNumber) => String(agentNumber).trim())
            .filter((agentNumber) => agentNumber.length > 0)
        )
      ).sort((left, right) => left.localeCompare(right, "he", { numeric: true })),
    [options]
  );

  const updateMenuPosition = useCallback(() => {
    const inputEl = inputRef.current;
    if (!inputEl) {
      return null;
    }

    const rect = inputEl.getBoundingClientRect();
    const next: MenuPosition = {
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    };
    setMenuPosition(next);
    return next;
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (committedValueRef.current === value) {
      return;
    }
    committedValueRef.current = value;
    setSearchText(value === "all" ? "" : value);
  }, [value]);

  const queryDigits = digitsOnly(searchText);

  const filteredOptions = useMemo(() => {
    if (!queryDigits) {
      return normalizedOptions;
    }
    return normalizedOptions.filter((agentNumber) =>
      digitsOnly(agentNumber).startsWith(queryDigits)
    );
  }, [normalizedOptions, queryDigits]);

  useLayoutEffect(() => {
    if (open) {
      updateMenuPosition();
    } else {
      setMenuPosition(null);
    }
  }, [open, updateMenuPosition, searchText, filteredOptions.length]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function handleScrollOrResize() {
      updateMenuPosition();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [open, updateMenuPosition]);

  function selectOption(next: string) {
    committedValueRef.current = next;
    if (next === "all") {
      onChange("all");
      setSearchText("");
    } else {
      onChange(next);
      setSearchText(next);
    }
    setOpen(false);
  }

  const showAllOption = !queryDigits;
  const showNoMatches = queryDigits.length > 0 && filteredOptions.length === 0;

  const portalContainer = mounted ? getPortalContainer() : null;

  const dropdownMenu =
    open && menuPosition && menuPosition.width > 0 && portalContainer ? (
      <ul
        ref={menuRef}
        id={listboxId}
        role="listbox"
        className="agent-autocomplete-menu agent-autocomplete-menu--portal"
        dir="rtl"
        style={{
          position: "fixed",
          top: menuPosition.top,
          left: menuPosition.left,
          width: menuPosition.width,
          zIndex: 999999,
          margin: 0,
          pointerEvents: "auto",
        }}
      >
        {showAllOption ? (
          <li className="agent-autocomplete-item" role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={value === "all"}
              className={`agent-autocomplete-option ${
                value === "all" ? "agent-autocomplete-option--selected" : ""
              }`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectOption("all")}
            >
              הכל
            </button>
          </li>
        ) : null}
        {filteredOptions.map((agentNumber) => (
          <li key={agentNumber} className="agent-autocomplete-item" role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={value === agentNumber}
              className={`agent-autocomplete-option ${
                value === agentNumber ? "agent-autocomplete-option--selected" : ""
              }`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectOption(agentNumber)}
            >
              {agentNumber}
            </button>
          </li>
        ))}
        {showNoMatches ? (
          <li className="agent-autocomplete-empty" role="presentation">
            אין מספרים תואמים
          </li>
        ) : null}
      </ul>
    ) : null;

  return (
    <>
      <div className="agent-autocomplete" ref={rootRef} dir="rtl">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          className="agent-autocomplete-input"
          value={searchText}
          onChange={(event) => {
            const next = event.target.value;
            setSearchText(next);
            setOpen(true);
            requestAnimationFrame(() => {
              updateMenuPosition();
            });
            if (digitsOnly(next).length === 0) {
              committedValueRef.current = "all";
              onChange("all");
            }
          }}
          onFocus={() => {
            setOpen(true);
            requestAnimationFrame(() => {
              updateMenuPosition();
            });
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-label={ariaLabel}
          placeholder={placeholder}
          autoComplete="off"
        />
      </div>
      {dropdownMenu && portalContainer
        ? createPortal(dropdownMenu, portalContainer)
        : null}
    </>
  );
}
