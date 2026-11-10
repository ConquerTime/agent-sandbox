import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

/**
 * Context for managing scroll state and behavior
 */
const ScrollContext = createContext<{
  scrollState: {
    scrollTop: number;
    scrollLeft: number;
    scrollHeight: number;
    scrollWidth: number;
    isScrolling: boolean;
    isAtBottom: boolean;
  };
  scrollElementRef: React.RefObject<HTMLDivElement | null>;
  updateScrollPosition: (position: {
    scrollTop: number;
    scrollLeft: number;
  }) => void;
  updateScrollDimensions: (dimensions: {
    scrollTop?: number;
    scrollLeft?: number;
    clientWidth?: number;
    clientHeight?: number;
    scrollWidth?: number;
    scrollHeight?: number;
  }) => void;
  checkIfAtBottom: () => boolean;
  setIsScrolling: (isScrolling: boolean) => void;
  scrollToBottom: (smooth?: boolean) => void;
  scrollTo: (options?: ScrollToOptions) => void;
  resetScroll: () => void;
}>({
  scrollState: {
    scrollTop: 0,
    scrollLeft: 0,
    scrollHeight: 0,
    scrollWidth: 0,
    isScrolling: false,
    isAtBottom: false,
  },
  scrollElementRef: {
    current: null,
  },
  updateScrollPosition: () => {},
  updateScrollDimensions: () => {},
  checkIfAtBottom: () => false,
  setIsScrolling: () => {},
  scrollToBottom: () => {},
  scrollTo: () => {},
  resetScroll: () => {},
});

/**
 * Hook to access scroll context
 */
export function useScrollContext() {
  const context = useContext(ScrollContext);
  if (!context) {
    throw new Error('useScrollContext must be used within ScrollProvider');
  }
  return context;
}

/**
 * Provider component for scroll state management
 */
export function ScrollProvider({ children }: { children: React.ReactNode }) {
  const [scrollState, setScrollState] = useState({
    scrollTop: 0,
    scrollLeft: 0,
    scrollHeight: 0,
    scrollWidth: 0,
    clientHeight: 0,
    clientWidth: 0,
    isScrolling: false,
    isAtBottom: false,
  });

  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollElementRef = useRef<HTMLDivElement | null>(null);

  /**
   * Update scroll position
   */
  const updateScrollPosition = useCallback(
    (position: { scrollTop: number; scrollLeft?: number }) => {
      setScrollState((prev) => ({
        ...prev,
        ...position,
      }));
    },
    []
  );

  /**
   * Update scroll dimensions
   */
  const updateScrollDimensions = useCallback(
    (dimensions: {
      scrollWidth?: number;
      scrollHeight?: number;
      clientWidth?: number;
      clientHeight?: number;
      scrollTop?: number;
      scrollLeft?: number;
    }) => {
      setScrollState((prev) => {
        const newState = {
          ...prev,
          ...dimensions,
        };

        // 计算是否在底部
        if (
          dimensions.scrollTop !== undefined &&
          dimensions.scrollHeight !== undefined &&
          dimensions.clientHeight !== undefined
        ) {
          newState.isAtBottom =
            Math.floor(
              Math.abs(
                dimensions.scrollTop +
                  dimensions.clientHeight -
                  dimensions.scrollHeight
              )
            ) <= 1;
        }

        return newState;
      });
    },
    []
  );

  /**
   * Check if scrolled to bottom
   */
  const checkIfAtBottom = useCallback(() => {
    if (!scrollElementRef.current) return false;
    const { scrollTop, scrollHeight, clientHeight } = scrollElementRef.current;
    return scrollTop + clientHeight >= scrollHeight - 10;
  }, []);

  /**
   * Set scrolling state
   */
  const setIsScrolling = useCallback((isScrolling: boolean) => {
    setScrollState((prev) => ({
      ...prev,
      isScrolling,
    }));
  }, []);

  /**
   * Scroll to bottom
   */
  const scrollToBottom = useCallback(
    (smooth = false) => {
      if (!scrollElementRef.current) return;

      const element = scrollElementRef.current;

      element.scrollTo({
        top: element.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });

      requestAnimationFrame(() => {
        updateScrollDimensions({
          scrollTop: element.scrollTop,
          scrollLeft: element.scrollLeft,
          scrollHeight: element.scrollHeight,
          scrollWidth: element.scrollWidth,
          clientHeight: element.clientHeight,
          clientWidth: element.clientWidth,
        });
      });
    },
    [updateScrollDimensions]
  );

  /**
   * Scroll to specific position
   */
  const scrollTo = useCallback((options?: ScrollToOptions) => {
    if (!scrollElementRef.current) return;
    scrollElementRef.current.scrollTo(options);
  }, []);

  /**
   * Reset scroll position
   */
  const resetScroll = useCallback(() => {
    if (!scrollElementRef.current) return;
    scrollElementRef.current.scrollTo({
      top: 0,
      left: 0,
    });
  }, []);

  /**
   * Get current scroll position
   */
  const getCurrentScrollPosition = useCallback(() => {
    if (!scrollElementRef.current) {
      return { scrollTop: 0, scrollLeft: 0 };
    }
    return {
      scrollTop: scrollElementRef.current.scrollTop,
      scrollLeft: scrollElementRef.current.scrollLeft,
    };
  }, []);

  /**
   * Get scroll dimensions
   */
  const getScrollDimensions = useCallback(() => {
    if (!scrollElementRef.current) {
      return {
        scrollHeight: 0,
        scrollWidth: 0,
        clientHeight: 0,
        clientWidth: 0,
      };
    }
    return {
      scrollHeight: scrollElementRef.current.scrollHeight,
      scrollWidth: scrollElementRef.current.scrollWidth,
      clientHeight: scrollElementRef.current.clientHeight,
      clientWidth: scrollElementRef.current.clientWidth,
    };
  }, []);

  /**
   * Schedule callback at next animation frame
   */
  const scheduleAtNextAnimationFrame = useCallback((callback: () => void) => {
    const handle = window.requestAnimationFrame(callback);
    return () => window.cancelAnimationFrame(handle);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const contextValue = {
    scrollState,
    scrollElementRef,
    updateScrollPosition,
    updateScrollDimensions,
    checkIfAtBottom,
    setIsScrolling,
    scrollToBottom,
    scrollTo,
    resetScroll,
    getCurrentScrollPosition,
    getScrollDimensions,
    scheduleAtNextAnimationFrame,
  };

  return (
    <ScrollContext.Provider value={contextValue}>
      {children}
    </ScrollContext.Provider>
  );
}
