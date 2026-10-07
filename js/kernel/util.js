/**
 * CuriOS DOM Utilities
 *
 * Shared helpers used throughout the CuriOS shell and applications.
 */

/**
 * Create a DOM element.
 *
 * Example:
 *
 * h("button", {
 *   className: "dock-button",
 *   dataset: {
 *     appId: "scribe",
 *     pinned: "true"
 *   },
 *   style: {
 *     display: "flex"
 *   },
 *   onclick: () => {}
 * }, "Scribe");
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);

  if (props && typeof props === "object") {
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined || value === null || value === false) {
        continue;
      }

      /*
       * dataset is a getter-only DOMStringMap.
       *
       * WRONG:
       *   el.dataset = { appId: "scribe" };
       *
       * RIGHT:
       *   el.dataset.appId = "scribe";
       */
      if (key === "dataset" && typeof value === "object") {
        for (const [dataKey, dataValue] of Object.entries(value)) {
          if (dataValue === undefined || dataValue === null) {
            continue;
          }

          el.dataset[dataKey] = String(dataValue);
        }

        continue;
      }

      /*
       * style is also a browser-managed object.
       * Merge style properties rather than replacing el.style.
       */
      if (key === "style" && typeof value === "object") {
        for (const [styleKey, styleValue] of Object.entries(value)) {
          if (styleValue === undefined || styleValue === null) {
            continue;
          }

          try {
            el.style[styleKey] = String(styleValue);
          } catch (err) {
            console.warn(
              `[CuriOS] Unable to set style "${styleKey}" on <${tag}>`,
              err
            );
          }
        }

        continue;
      }

      /*
       * Allow:
       *
       * attrs: {
       *   "aria-label": "...",
       *   title: "..."
       * }
       */
      if (key === "attrs" && typeof value === "object") {
        for (const [attrName, attrValue] of Object.entries(value)) {
          if (
            attrValue === undefined ||
            attrValue === null ||
            attrValue === false
          ) {
            continue;
          }

          if (attrValue === true) {
            el.setAttribute(attrName, "");
          } else {
            el.setAttribute(attrName, String(attrValue));
          }
        }

        continue;
      }

      /*
       * Convenient class arrays:
       *
       * classList: ["dock-item", "active"]
       */
      if (key === "classList") {
        const classes = Array.isArray(value)
          ? value
          : String(value).split(/\s+/);

        for (const className of classes) {
          if (className) {
            el.classList.add(className);
          }
        }

        continue;
      }

      /*
       * Event listener shorthand:
       *
       * onclick
       * onpointerdown
       * oncontextmenu
       * etc.
       */
      if (
        key.startsWith("on") &&
        typeof value === "function"
      ) {
        const eventName = key.slice(2).toLowerCase();

        el.addEventListener(eventName, value);
        continue;
      }

      /*
       * class is commonly passed instead of className.
       */
      if (key === "class") {
        el.className = String(value);
        continue;
      }

      /*
       * Boolean DOM properties.
       */
      if (value === true) {
        if (key in el) {
          try {
            el[key] = true;
          } catch {
            el.setAttribute(key, "");
          }
        } else {
          el.setAttribute(key, "");
        }

        continue;
      }

      /*
       * Prefer DOM properties where they're safely writable.
       *
       * This handles:
       *   className
       *   id
       *   title
       *   value
       *   checked
       *   disabled
       *   src
       *   href
       *   type
       *   etc.
       *
       * If the browser exposes a getter-only property, fall back
       * to setAttribute instead of crashing CuriOS initialization.
       */
      if (key in el) {
        try {
          el[key] = value;
          continue;
        } catch {
          // Fall through to setAttribute().
        }
      }

      /*
       * ariaLabel -> aria-label
       * dataFoo  -> data-foo
       *
       * Explicit dataset{} remains preferred for data attributes.
       */
      if (key.startsWith("aria") && key.length > 4) {
        const attrName =
          "aria-" +
          key
            .slice(4)
            .replace(/([A-Z])/g, "-$1")
            .toLowerCase();

        el.setAttribute(attrName, String(value));
        continue;
      }

      el.setAttribute(key, String(value));
    }
  }

  appendChildren(el, children);

  return el;
}


/**
 * Append arbitrary children to an element.
 *
 * Supports:
 * - DOM Nodes
 * - strings
 * - numbers
 * - nested arrays
 *
 * Ignores:
 * - null
 * - undefined
 * - false
 */
function appendChildren(parent, children) {
  for (const child of children) {
    if (
      child === undefined ||
      child === null ||
      child === false
    ) {
      continue;
    }

    if (Array.isArray(child)) {
      appendChildren(parent, child);
      continue;
    }

    if (child instanceof Node) {
      parent.appendChild(child);
      continue;
    }

    parent.appendChild(
      document.createTextNode(String(child))
    );
  }
}


/**
 * Query selector shortcut.
 */
export function $(selector, root = document) {
  return root.querySelector(selector);
}


/**
 * Query selector all shortcut.
 */
export function $$(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}


/**
 * Clamp a number between min and max.
 */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}


/**
 * Generate a reasonably unique runtime ID.
 */
export function uid(prefix = "curios") {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}


/**
 * Debounce a function.
 */
export function debounce(fn, delay = 150) {
  let timer = null;

  return function debounced(...args) {
    clearTimeout(timer);

    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, delay);
  };
}


/**
 * Throttle a function.
 */
export function throttle(fn, delay = 100) {
  let lastRun = 0;
  let timer = null;

  return function throttled(...args) {
    const now = Date.now();
    const remaining = delay - (now - lastRun);

    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      lastRun = now;
      fn.apply(this, args);
      return;
    }

    if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        lastRun = Date.now();
        fn.apply(this, args);
      }, remaining);
    }
  };
}


/**
 * Escape text for situations where a string must be inserted
 * into HTML markup.
 *
 * Prefer textContent / h() wherever possible.
 */
export function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/**
 * Sleep helper for async UI sequences.
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


/**
 * Dispatch a CuriOS custom event.
 */
export function emit(name, detail = {}) {
  window.dispatchEvent(
    new CustomEvent(name, {
      detail
    })
  );
}


/**
 * Listen for a CuriOS custom event.
 *
 * Returns an unsubscribe function.
 */
export function on(name, handler, options) {
  window.addEventListener(name, handler, options);

  return () => {
    window.removeEventListener(name, handler, options);
  };
}


/**
 * Safely parse JSON.
 */
export function parseJSON(value, fallback = null) {
  if (typeof value !== "string") {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}


/**
 * Read JSON from localStorage.
 */
export function loadJSON(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);

    if (value === null) {
      return fallback;
    }

    return parseJSON(value, fallback);
  } catch (err) {
    console.warn(
      `[CuriOS] Unable to read localStorage key "${key}"`,
      err
    );

    return fallback;
  }
}


/**
 * Write JSON to localStorage.
 */
export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(
      `[CuriOS] Unable to write localStorage key "${key}"`,
      err
    );

    return false;
  }
}


/**
 * Remove a localStorage value safely.
 */
export function removeStored(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.warn(
      `[CuriOS] Unable to remove localStorage key "${key}"`,
      err
    );

    return false;
  }
}