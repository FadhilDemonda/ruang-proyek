"use client";

import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

type Option = { value: string; label: ReactNode; disabled?: boolean };

type MenuPosition = {
  top?: number;
  bottom?: number;
  left: number;
  minWidth: number;
  maxHeight: number;
  placement: "down" | "up";
};

const VIEWPORT_MARGIN = 8;
const MENU_GAP = 6;
const MAX_MENU_HEIGHT = 250;
const FLIP_THRESHOLD = 170;

export default function Select({
  children,
  value,
  onChange,
  id: triggerId,
  disabled,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const options: Option[] = [];
  Children.forEach(children, (child) => {
    if (
      isValidElement<{
        value?: string | number;
        children?: ReactNode;
        disabled?: boolean;
      }>(child)
    ) {
      options.push({
        value: String(child.props.value ?? child.props.children ?? ""),
        label: child.props.children,
        disabled: child.props.disabled,
      });
    }
  });

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const selected = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  const computePosition = useCallback((): MenuPosition | null => {
    const trigger = triggerRef.current;
    if (!trigger) return null;
    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceBelow = vh - rect.bottom - VIEWPORT_MARGIN - MENU_GAP;
    const spaceAbove = rect.top - VIEWPORT_MARGIN - MENU_GAP;
    const flipUp = spaceBelow < FLIP_THRESHOLD && spaceAbove > spaceBelow;
    const availableHeight = flipUp ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(88, Math.min(MAX_MENU_HEIGHT, availableHeight));
    const minWidth = Math.ceil(rect.width);
    const measuredWidth = menuRef.current?.offsetWidth ?? minWidth;
    const widthForClamp = Math.max(minWidth, measuredWidth);
    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(rect.left, vw - widthForClamp - VIEWPORT_MARGIN),
    );

    if (flipUp) {
      return {
        bottom: vh - rect.top + MENU_GAP,
        left,
        minWidth,
        maxHeight,
        placement: "up",
      };
    }

    return {
      top: rect.bottom + MENU_GAP,
      left,
      minWidth,
      maxHeight,
      placement: "down",
    };
  }, []);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!open || !menu) {
      setMenuPos(null);
      return;
    }
    if (typeof menu.showPopover === "function" && !menu.matches(":popover-open")) {
      try {
        menu.showPopover();
      } catch {
        // Fallback to fixed stacking if popover promotion is unavailable.
      }
    }
    setMenuPos(computePosition());
    return () => {
      if (typeof menu.hidePopover === "function" && menu.matches(":popover-open")) {
        try {
          menu.hidePopover();
        } catch {
          // Ignore if already disconnected.
        }
      }
    };
  }, [open, computePosition]);

  useEffect(() => {
    if (!open) return;
    let rafId = 0;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !root.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    const syncPosition = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const next = computePosition();
        if (next) setMenuPos(next);
      });
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", syncPosition);
    window.addEventListener("scroll", syncPosition, true);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", syncPosition);
      window.removeEventListener("scroll", syncPosition, true);
    };
  }, [open, computePosition]);

  function openMenu() {
    setActive(selected);
    setMenuPos(computePosition());
    setOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange({
      target: { value: option.value },
    } as ChangeEvent<HTMLSelectElement>);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function key(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openMenu();
      } else {
        setActive((i) =>
          Math.max(
            0,
            Math.min(options.length - 1, i + (event.key === "ArrowDown" ? 1 : -1)),
          ),
        );
      }
      return;
    }
    if (open && (event.key === "Home" || event.key === "End")) {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : Math.max(0, options.length - 1));
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      choose(active);
    }
  }

  return (
    <div className="select-wrap" ref={root}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        className="select-trigger"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={id}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        aria-haspopup="listbox"
        onKeyDown={key}
        onClick={() => {
          if (disabled) return;
          if (open) setOpen(false);
          else openMenu();
        }}
      >
        <span>{options[selected]?.label}</span>
        <span aria-hidden="true" className={"select-chevron " + (open ? "up" : "")}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>
      {open && (
        <div
          ref={menuRef}
          popover="manual"
          className="select-menu select-menu-portal"
          id={id}
          role="listbox"
          data-placement={menuPos?.placement ?? "down"}
          style={
            menuPos
              ? {
                  top: menuPos.top,
                  bottom: menuPos.bottom,
                  left: menuPos.left,
                  minWidth: menuPos.minWidth,
                  maxHeight: menuPos.maxHeight,
                }
              : undefined
          }
        >
          {options.map((option, index) => (
            <button
              type="button"
              role="option"
              id={`${id}-${index}`}
              aria-selected={index === selected}
              key={`${option.value}-${index}`}
              disabled={option.disabled}
              className={
                "select-option " +
                (index === active ? "highlight " : "") +
                (index === selected ? "chosen" : "")
              }
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(index)}
            >
              <span>{option.label}</span>
              {index === selected && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
