import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Loader2, X } from "lucide-react";

// Searchable dropdown (single or multi select, optional async loading with paging).
//
// Drop-in for the old native select: `options` are { value, label }, `value` is the selected
// value (an array when `isMultiple`), and `onChange` receives an event-like { target: { name, value } },
// so existing `onChange={(e) => setX(e.target.value)}` code keeps working. Clearing gives "" (or []).
//
// Async: pass isAsync + loadOptions({ search, page, params }) -> { options, hasMore }.
// Pages are cached per search/cacheKey. Change `cacheKey` when the options depend on another
// field (e.g. a seller): the cache is dropped and the current value is cleared.
// For a preselected value that is not in the first page, pass it in `initialOptions` so its
// label can be shown.
//
// `disabledValues`: values that cannot be picked right now (shown greyed out as "Already added"), e.g. products
// already on the document. The field's own current value is never disabled.
//
// The menu is portalled to <body> so modals, cards and table wrappers can never clip it.

const MENU_MAX_HEIGHT = 300;
const MENU_MIN_HEIGHT = 120;
const MENU_GAP = 6;
const VIEWPORT_MARGIN = 8;

const sameValue = (a, b) => String(a) === String(b);

const summarizeCache = (cacheEntry) => {
  const pages = cacheEntry?.pages ?? {};
  const pageNumbers = Object.keys(pages).map(Number).sort((a, b) => a - b);
  const seen = new Set();
  const options = [];

  pageNumbers.forEach((pageNumber) => {
    pages[pageNumber].options.forEach((option) => {
      const key = String(option.value);
      if (!seen.has(key)) {
        seen.add(key);
        options.push(option);
      }
    });
  });

  const lastPage = pageNumbers.length ? pageNumbers[pageNumbers.length - 1] : 0;

  return {
    options,
    page: lastPage,
    hasMore: pageNumbers.length ? pages[lastPage].hasMore : false,
  };
};

const EMPTY_ASYNC_STATE = { options: [], page: 0, hasMore: false, loading: false };

const Select = ({
  label,
  options = [],
  value,
  onChange,
  name,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  noOptionsText = "No options found",
  error,
  helperText,
  isRequired = false,
  isDisabled = false,
  isFullWidth = true,
  isClearable = false,
  isMultiple = false,
  isAsync = false,
  loadOptions,
  loadParams,
  cacheKey,
  debounceDelay = 300,
  initialOptions = [],
  disabledValues = [],
  className = "",
  id,
  "aria-label": ariaLabel,
}) => {
  const generatedId = useId();
  const fieldId = id || generatedId;

  const wrapperRef = useRef(null);
  const fieldRef = useRef(null);
  const menuRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  // Labels of options the user picked, so they can still be shown after the list changes.
  const [pickedOptions, setPickedOptions] = useState([]);

  const [asyncState, setAsyncState] = useState(EMPTY_ASYNC_STATE);
  const cacheRef = useRef({});
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(new Set());
  const loadOptionsRef = useRef(loadOptions);
  const loadParamsRef = useRef(loadParams);

  useEffect(() => {
    loadOptionsRef.current = loadOptions;
    loadParamsRef.current = loadParams;
  });

  const scopeKey = JSON.stringify({ cacheKey, params: loadParams });

  // The visible async list belongs to one scope; start clean when the scope changes.
  const [asyncScope, setAsyncScope] = useState(scopeKey);
  if (asyncScope !== scopeKey) {
    setAsyncScope(scopeKey);
    setAsyncState(EMPTY_ASYNC_STATE);
    setSearch("");
    setOpen(false);
  }

  // Dependent dropdown: when the scope changes after mount, the old value is no longer valid.
  const previousScopeRef = useRef(scopeKey);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    if (previousScopeRef.current === scopeKey) return;
    previousScopeRef.current = scopeKey;
    onChangeRef.current?.({ target: { name, value: isMultiple ? [] : "" } });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the scope changing
  }, [scopeKey]);

  const emit = (nextValue) => onChange?.({ target: { name, value: nextValue } });

  const selectedValues = isMultiple
    ? (Array.isArray(value) ? value : [])
    : value === undefined || value === null || value === ""
      ? []
      : [value];

  const isSelected = (optionValue) => selectedValues.some((v) => sameValue(v, optionValue));

  const labelFor = (optionValue) => {
    const found = [...options, ...asyncState.options, ...pickedOptions, ...initialOptions].find((o) =>
      sameValue(o.value, optionValue)
    );
    return found ? found.label : String(optionValue);
  };

  // Single select: an option with value "" (e.g. "All Status") is a legitimate selection to display.
  const emptyOption = !isMultiple && value === "" ? options.find((o) => o.value === "") : undefined;
  const displayValue = isMultiple
    ? ""
    : emptyOption
      ? emptyOption.label
      : selectedValues.length
        ? labelFor(selectedValues[0])
        : "";
  const hasValue = selectedValues.length > 0;

  const closeMenu = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  const openMenu = () => {
    if (isDisabled) return;
    setActiveIndex(0);
    setOpen(true);
  };

  // --- async loading -------------------------------------------------------------------

  const fetchPage = useCallback(
    async (searchValue, pageNumber) => {
      const key = JSON.stringify({ search: searchValue, scopeKey });
      const cached = cacheRef.current[key]?.pages[pageNumber];

      if (cached) {
        setAsyncState({ ...summarizeCache(cacheRef.current[key]), loading: false });
        return;
      }

      const flightKey = `${key}|${pageNumber}`;
      if (inFlightRef.current.has(flightKey) || !loadOptionsRef.current) return;
      inFlightRef.current.add(flightKey);

      const requestId = ++requestIdRef.current;
      setAsyncState((previous) => ({ ...previous, loading: true }));

      try {
        const result = await loadOptionsRef.current({
          search: searchValue,
          page: pageNumber,
          params: loadParamsRef.current,
        });

        // A newer request superseded this one.
        if (requestId !== requestIdRef.current) return;

        cacheRef.current[key] = {
          pages: {
            ...cacheRef.current[key]?.pages,
            [pageNumber]: { options: result.options, hasMore: Boolean(result.hasMore) },
          },
        };
        setAsyncState({ ...summarizeCache(cacheRef.current[key]), loading: false });
      } catch (requestError) {
        console.error("Failed to load dropdown options:", requestError);
        if (requestId === requestIdRef.current) {
          setAsyncState((previous) => ({ ...previous, loading: false }));
        }
      } finally {
        inFlightRef.current.delete(flightKey);
      }
    },
    [scopeKey]
  );

  // Load when opened and on every search change. Cached pages are used without a request;
  // typing a new search is debounced.
  useEffect(() => {
    if (!isAsync || !open) return;

    const key = JSON.stringify({ search, scopeKey });
    const immediate = search === "" || Boolean(cacheRef.current[key]?.pages[0]);

    if (immediate) {
      fetchPage(search, 0);
      return;
    }

    const handle = setTimeout(() => fetchPage(search, 0), debounceDelay);
    return () => clearTimeout(handle);
  }, [isAsync, open, search, scopeKey, debounceDelay, fetchPage]);

  const handleListScroll = (event) => {
    if (!isAsync || asyncState.loading || !asyncState.hasMore) return;

    const element = event.currentTarget;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;

    if (distanceFromBottom <= 60) fetchPage(search, asyncState.page + 1);
  };

  // --- visible options -----------------------------------------------------------------

  const baseOptions = isAsync
    ? asyncState.options
    : options.filter((option) => option.label.toLowerCase().includes(search.trim().toLowerCase()));

  const visibleOptions = isMultiple
    ? baseOptions.filter((option) => !isSelected(option.value))
    : baseOptions;

  const clampedActive = Math.min(activeIndex, Math.max(visibleOptions.length - 1, 0));

  // --- selection -----------------------------------------------------------------------

  const isOptionDisabled = (option) =>
    disabledValues.some((disabledValue) => sameValue(disabledValue, option.value)) && !isSelected(option.value);

  const handleSelect = (option) => {
    if (isOptionDisabled(option)) return;

    setPickedOptions((previous) =>
      previous.some((o) => sameValue(o.value, option.value)) ? previous : [...previous, option]
    );

    if (isMultiple) {
      emit([...selectedValues, option.value]);
      setSearch("");
      setActiveIndex(0);
      inputRef.current?.focus();
      return;
    }

    emit(option.value);
    closeMenu();
  };

  const handleRemove = (event, optionValue) => {
    event.stopPropagation();
    if (isDisabled) return;
    emit(selectedValues.filter((v) => !sameValue(v, optionValue)));
    // Keep typing/Backspace working after clicking a tag's remove button.
    if (open) inputRef.current?.focus();
  };

  const handleClear = (event) => {
    event.stopPropagation();
    if (isDisabled) return;
    emit(isMultiple ? [] : "");
    setSearch("");
  };

  // --- keyboard ------------------------------------------------------------------------

  const handleKeyDown = (event) => {
    if (isDisabled) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) openMenu();
        else setActiveIndex(Math.min(clampedActive + 1, visibleOptions.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        if (open) setActiveIndex(Math.max(clampedActive - 1, 0));
        break;
      case "Enter":
        // Never submit the surrounding form from the dropdown.
        event.preventDefault();
        if (!open) openMenu();
        else if (visibleOptions[clampedActive]) handleSelect(visibleOptions[clampedActive]);
        break;
      case " ":
        if (!open) {
          event.preventDefault();
          openMenu();
        }
        break;
      case "Escape":
        if (open) {
          // Close only the dropdown, not a modal around it.
          event.stopPropagation();
          closeMenu();
        }
        break;
      case "Tab":
        if (open) closeMenu();
        break;
      case "Backspace":
        if (isMultiple && open && search === "" && selectedValues.length) {
          emit(selectedValues.slice(0, -1));
        }
        break;
      default:
    }
  };

  // --- open/close side effects ---------------------------------------------------------

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event) => {
      const target = event.target;
      if (!wrapperRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open, closeMenu]);

  // Position the portalled menu against the field: below it, or above when there is more room there.
  const positionMenu = useCallback(() => {
    const menu = menuRef.current;
    const list = listRef.current;
    const anchor = fieldRef.current;
    if (!menu || !list || !anchor) return;

    const rect = anchor.getBoundingClientRect();
    const naturalHeight = Math.min(list.scrollHeight + 2, MENU_MAX_HEIGHT);
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - MENU_GAP - VIEWPORT_MARGIN;
    const openAbove = naturalHeight > spaceBelow && spaceAbove > spaceBelow;
    const space = Math.max(openAbove ? spaceAbove : spaceBelow, MENU_MIN_HEIGHT);

    menu.style.left = `${rect.left}px`;
    menu.style.width = `${rect.width}px`;
    menu.style.top = openAbove ? "auto" : `${rect.bottom + MENU_GAP}px`;
    menu.style.bottom = openAbove ? `${window.innerHeight - rect.top + MENU_GAP}px` : "auto";
    list.style.maxHeight = `${Math.min(MENU_MAX_HEIGHT, space)}px`;
  }, []);

  // Re-measure after every render while open (options load, tags change the field's height).
  useLayoutEffect(() => {
    if (open) positionMenu();
  });

  // Keep the menu attached to the field while the page or any ancestor scrolls or resizes.
  useEffect(() => {
    if (!open) return;

    const reposition = (event) => {
      // Scrolling the options list itself must not move the menu.
      if (event.target instanceof Node && menuRef.current?.contains(event.target)) return;
      positionMenu();
    };

    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, positionMenu]);

  // Keep the keyboard-highlighted option in view.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [open, clampedActive, visibleOptions.length]);

  const handleFieldClick = () => {
    if (isDisabled) return;
    if (open) closeMenu();
    else openMenu();
  };

  const showInitialLoading = isAsync && asyncState.loading && visibleOptions.length === 0;

  const fieldClasses = `flex min-h-[2.625rem] w-full items-center gap-2 rounded-lg border bg-white px-3 text-sm transition ${
    isDisabled
      ? "cursor-not-allowed bg-gray-50 text-gray-500"
      : "cursor-pointer"
  } ${
    error
      ? "border-red-300 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100"
      : open
        ? "border-blue-500 ring-2 ring-blue-100"
        : "border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
  }`;

  const searchInput = (
    <input
      ref={inputRef}
      id={fieldId}
      type="text"
      value={isMultiple ? search : open ? search : displayValue}
      readOnly={!open}
      disabled={isDisabled}
      placeholder={
        open ? searchPlaceholder : hasValue || emptyOption ? "" : placeholder
      }
      onChange={(e) => {
        setSearch(e.target.value);
        setActiveIndex(0);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!open) openMenu();
      }}
      onKeyDown={handleKeyDown}
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
      aria-label={ariaLabel}
      aria-invalid={!!error}
      autoComplete="off-search"
      className={`min-w-0 bg-transparent py-2 text-gray-900 outline-none placeholder:text-gray-400 ${
        isMultiple ? "w-24 flex-1" : "w-full flex-1"
      } ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"} ${open ? "cursor-text" : ""}`}
    />
  );

  return (
    <div ref={wrapperRef} className={`${isFullWidth ? "w-full" : ""} ${className}`}>
      {label && (
        <label
          htmlFor={fieldId}
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          {label}
          {isRequired && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}

      <div
        ref={fieldRef}
        className={fieldClasses}
        onClick={handleFieldClick}
        // The multi-select field has no always-present input, so the field itself takes focus.
        tabIndex={isMultiple && !open && !isDisabled ? 0 : undefined}
        onKeyDown={isMultiple && !open ? handleKeyDown : undefined}
      >
        {isMultiple ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 py-1.5">
            {selectedValues.map((selectedValue) => (
              <span
                key={String(selectedValue)}
                className="inline-flex max-w-full items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
              >
                <span className="truncate">{labelFor(selectedValue)}</span>
                <button
                  type="button"
                  onClick={(e) => handleRemove(e, selectedValue)}
                  disabled={isDisabled}
                  aria-label={`Remove ${labelFor(selectedValue)}`}
                  className="rounded p-0.5 text-blue-500 transition hover:bg-blue-100 hover:text-blue-700"
                >
                  <X size={12} />
                </button>
              </span>
            ))}

            {open ? (
              searchInput
            ) : (
              !hasValue && <span className="py-0.5 text-gray-400">{placeholder}</span>
            )}
          </div>
        ) : (
          searchInput
        )}

        {isClearable && hasValue && !isDisabled ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear selection"
            className="shrink-0 rounded p-0.5 text-gray-400 transition hover:text-gray-600"
          >
            <X size={16} />
          </button>
        ) : (
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </div>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-70 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
          >
            <div
              ref={listRef}
              role="listbox"
              aria-multiselectable={isMultiple}
              onScroll={handleListScroll}
              className="overflow-y-auto py-1"
            >
              {showInitialLoading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-3 text-sm text-gray-500">
                  <Loader2 size={16} className="animate-spin" />
                  Loading...
                </div>
              ) : visibleOptions.length === 0 ? (
                <div className="px-4 py-3 text-center text-sm text-gray-500">{noOptionsText}</div>
              ) : (
                <>
                  {visibleOptions.map((option, index) => {
                    const selected = isSelected(option.value);
                    const active = index === clampedActive;
                    const optionDisabled = isOptionDisabled(option);

                    return (
                      <button
                        key={String(option.value)}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        aria-disabled={optionDisabled || undefined}
                        data-active={active}
                        onClick={() => handleSelect(option)}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition ${
                          optionDisabled
                            ? "cursor-not-allowed text-gray-400"
                            : selected
                              ? "font-medium text-blue-600"
                              : "text-gray-700"
                        } ${active && !optionDisabled ? "bg-gray-100" : selected ? "bg-blue-50" : ""}`}
                      >
                        <span className="min-w-0 truncate">{option.label}</span>
                        {optionDisabled && <span className="shrink-0 text-xs text-gray-400">Already added</span>}
                      </button>
                    );
                  })}

                  {isAsync && asyncState.loading && (
                    <div className="flex items-center justify-center gap-2 px-4 py-2 text-xs text-gray-500">
                      <Loader2 size={14} className="animate-spin" />
                      Loading...
                    </div>
                  )}
                </>
              )}
            </div>
          </div>,
          document.body
        )}

      {error ? (
        <p className="mt-1.5 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
      ) : null}
    </div>
  );
};

export default Select;
