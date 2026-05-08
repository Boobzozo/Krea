
/**
 * Standardized scrolling utilities for the Kréa application.
 */

interface ScrollOptions {
  offset?: number;
  behavior?: ScrollBehavior;
}

/**
 * Scroll to the very top of the window
 */
export const scrollToTop = (behavior: ScrollBehavior = 'smooth') => {
  window.scrollTo({
    top: 0,
    behavior
  });
};

/**
 * Scroll to a specific element by its ID or ref
 * @param target Element ID or React ref current
 * @param options Offset for sticky headers, behavior
 */
export const scrollToElement = (
  target: string | HTMLElement | null,
  options: ScrollOptions = {}
) => {
  const { offset = 120, behavior = 'smooth' } = options;
  
  let element: HTMLElement | null = null;
  
  if (typeof target === 'string') {
    element = document.getElementById(target.replace('#', ''));
  } else {
    element = target;
  }

  if (element) {
    const elementPosition = element.getBoundingClientRect().top + window.scrollY;
    const offsetPosition = elementPosition - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior
    });
  }
};
