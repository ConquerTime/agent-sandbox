import { useEffect, useRef, useState } from 'react';
import { SKIP_NEXT_AUTO_SCROLL_DATASET_KEY } from './constants';
import type { ScrollableDivType } from './ScrollableDiv';
import { useScrollContext } from './scrollContext';

/**
 * Custom hook for managing scroll to bottom behavior
 */
export function useAutoScrollToBottom(
  autoScroll = false,
  contentContainerRef?: React.RefObject<HTMLDivElement | null>
) {
  const { scrollElementRef, checkIfAtBottom, scrollToBottom } =
    useScrollContext();
  const [isAtBottom, setIsAtBottom] = useState(false);

  const isAtBottomRef = useRef(isAtBottom);
  isAtBottomRef.current = isAtBottom;

  const lastScrollTopRef = useRef(0);
  const hasInitialScrolledRef = useRef(false);

  // 记录上次程序化 scrollToBottom 的时间戳，
  // 用于在短时间窗口内区分「程序化滚动」和「用户手动滚动」
  const lastProgrammaticScrollTimeRef = useRef(0);

  // 🔧 修复 4：初始化时读取当前滚动位置
  useEffect(() => {
    if (scrollElementRef.current) {
      lastScrollTopRef.current = scrollElementRef.current.scrollTop;
    }
  }, [scrollElementRef]);

  // 初始化时立即滚动到底部
  useEffect(() => {
    if (!autoScroll || !scrollElementRef.current) return;

    const performInitialScroll = () => {
      const element = scrollElementRef.current;
      // 🔧 修复 2：避免重复滚动
      if (!element || hasInitialScrolledRef.current) return;

      if (element.scrollHeight <= element.clientHeight) {
        setIsAtBottom(true);
        hasInitialScrolledRef.current = true;
        return;
      }

      scrollToBottom();
      setIsAtBottom(true);
      hasInitialScrolledRef.current = true;

      requestAnimationFrame(() => {
        if (element) {
          lastScrollTopRef.current = element.scrollTop;
        }
      });
    };

    performInitialScroll();

    // 🔧 修复 2：仅在首次失败时重试
    const timeoutId = setTimeout(() => {
      if (!hasInitialScrolledRef.current) {
        performInitialScroll();
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [autoScroll, scrollElementRef, scrollToBottom]);

  // 监听滚动，更新 isAtBottom 状态
  useEffect(() => {
    if (!autoScroll || !scrollElementRef.current) return;

    const element = scrollElementRef.current;

    const handleScroll = () => {
      const currentScrollTop = element.scrollTop;

      const scrollDiff = Math.abs(currentScrollTop - lastScrollTopRef.current);
      if (scrollDiff < 1) return;

      const isScrollingUp = currentScrollTop < lastScrollTopRef.current;
      lastScrollTopRef.current = currentScrollTop;

      // 程序化 scrollToBottom 产生的 scroll 事件在短窗口内到达，
      // 若方向是向下（程序化滚动），跳过以避免竞态设置 isAtBottom=false；
      // 向上滚动始终视为用户行为，立即响应。
      const recentProgrammatic =
        Date.now() - lastProgrammaticScrollTimeRef.current < 150;
      if (recentProgrammatic && !isScrollingUp) return;

      setIsAtBottom(checkIfAtBottom());
    };

    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element.removeEventListener('scroll', handleScroll);
  }, [autoScroll, scrollElementRef, checkIfAtBottom]);

  // 监听内容变化，仅在底部时自动滚动
  useEffect(() => {
    if (!autoScroll || !scrollElementRef.current) return;

    // 优先观察内容容器（内容变化会触发），否则观察滚动容器
    const targetElement =
      contentContainerRef?.current || scrollElementRef.current;
    if (!targetElement) return;

    const scrollElement = scrollElementRef.current;

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        const shouldSkipAutoScroll =
          scrollElement?.dataset[SKIP_NEXT_AUTO_SCROLL_DATASET_KEY] === 'true';

        if (shouldSkipAutoScroll) {
          delete scrollElement.dataset[SKIP_NEXT_AUTO_SCROLL_DATASET_KEY];

          if (scrollElement) {
            lastScrollTopRef.current = scrollElement.scrollTop;
          }

          return;
        }

        if (autoScroll && isAtBottomRef.current) {
          lastProgrammaticScrollTimeRef.current = Date.now();
          scrollToBottom();
          setIsAtBottom(true);

          if (scrollElement) {
            lastScrollTopRef.current = scrollElement.scrollTop;
          }
        } else {
          setIsAtBottom(checkIfAtBottom());
        }
      });
    });

    observer.observe(targetElement);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    autoScroll,
    scrollElementRef,
    contentContainerRef?.current, // 依赖 ref.current，而不是 ref 对象
    checkIfAtBottom,
    scrollToBottom,
  ]);

  return isAtBottom;
}

/**
 * Custom hook for managing scroll position triggers
 */
export function useScrollTriggers({
  scrollToBottomTrigger,
  resetScrollable,
  smoothScrollDuration = 0,
}: {
  scrollToBottomTrigger?: unknown;
  resetScrollable?: () => void;
  smoothScrollDuration: number;
}) {
  const { scrollToBottom, resetScroll } = useScrollContext();

  // Handle scroll to bottom trigger
  useEffect(() => {
    if (scrollToBottomTrigger !== undefined) {
      setTimeout(() => {
        scrollToBottom(smoothScrollDuration > 0);
      }, 0);
    }
  }, [scrollToBottomTrigger, scrollToBottom, smoothScrollDuration]);

  // Handle reset scroll trigger
  useEffect(() => {
    if (resetScrollable !== undefined) {
      resetScroll();
    }
  }, [resetScrollable, resetScroll]);
}

/**
 * Custom hook for managing ResizeObserver on content
 */
export function useContentResize(
  contentRef: React.RefObject<HTMLElement | null>,
  scrollElementRef: React.RefObject<HTMLElement | null>,
  onResize: (size: { width: number; height: number }) => void
) {
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  useEffect(() => {
    if (!contentRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;
      onResizeRef.current?.({ width, height });
    });

    observer.observe(contentRef.current);

    return () => {
      observer.disconnect();
    };
  }, [contentRef]);
}

/**
 * Custom hook for managing container resize with scroll to bottom
 */
export function useContainerResize({
  outerContainerRef,
  scrollElementRef,
  scrollingDirection,
  scrollToBottomOnContainerHeightChange = false,
  checkIfAtBottom,
  scrollToBottom,
  updateScrollDimensions,
}: {
  outerContainerRef: React.RefObject<HTMLDivElement | null>;
  scrollElementRef: React.RefObject<HTMLElement | null>;
  scrollingDirection: 'vertical' | 'horizontal' | 'both';
  scrollToBottomOnContainerHeightChange: boolean;
  checkIfAtBottom: () => boolean;
  scrollToBottom: () => void;
  updateScrollDimensions: (dimensions: {
    scrollTop?: number;
    scrollLeft?: number;
    clientWidth?: number;
    clientHeight?: number;
    scrollWidth?: number;
    scrollHeight?: number;
  }) => void;
}) {
  useEffect(() => {
    if (!outerContainerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const wasAtBottom = scrollToBottomOnContainerHeightChange
          ? checkIfAtBottom()
          : false;
        const { width, height } = entry.contentRect;

        if (scrollElementRef.current) {
          if (scrollingDirection === 'horizontal') {
            scrollElementRef.current.style.width = `${width}px`;
          } else if (scrollingDirection === 'vertical') {
            scrollElementRef.current.style.height = `${height}px`;
          } else {
            scrollElementRef.current.style.width = `${width}px`;
            scrollElementRef.current.style.height = `${height}px`;
          }
        }
        updateScrollDimensions?.({
          clientWidth: width,
          clientHeight: height,
        });

        if (scrollToBottomOnContainerHeightChange && wasAtBottom) {
          scrollToBottom();
        }
      }
    });

    observer.observe(outerContainerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [
    outerContainerRef,
    scrollElementRef,
    scrollingDirection,
    scrollToBottomOnContainerHeightChange,
    checkIfAtBottom,
    scrollToBottom,
    updateScrollDimensions,
  ]);
}

/**
 * Custom hook for tracking height changes
 */
export function useHeightChangeTracking(
  contentRef: React.RefObject<HTMLElement | null>,
  triggerOnHeightChange: boolean,
  onScroll?: () => void
) {
  const lastHeightRef = useRef(0);

  useEffect(() => {
    if (!contentRef.current) return;

    const observer = new ResizeObserver(() => {
      if (!contentRef.current) return;

      const currentHeight = contentRef.current.getBoundingClientRect().height;
      let shouldTrigger = true;

      if (currentHeight !== lastHeightRef.current) {
        lastHeightRef.current = currentHeight;
        shouldTrigger = triggerOnHeightChange ?? false;
      }

      if (shouldTrigger && onScroll) {
        onScroll();
      }
    });

    observer.observe(contentRef.current);

    return () => {
      observer.disconnect();
    };
  }, [contentRef, triggerOnHeightChange, onScroll]);
}

/**
 * Custom hook for handling load more on scroll up
 */
export function useLoadMoreOnScroll({
  onLoadMoreMessages,
  loadMoreThreshold = 100,
  enabled = false,
}: {
  onLoadMoreMessages?: ScrollableDivType['onLoadMoreMessages'];
  loadMoreThreshold?: number;
  enabled?: boolean;
}) {
  const { scrollState, scrollElementRef, scrollTo } = useScrollContext();
  const isLoadingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !onLoadMoreMessages || !scrollElementRef.current) return;

    const handleScroll = () => {
      // 如果正在加载中，避免重复触发
      if (isLoadingRef.current) return;

      const element = scrollElementRef.current;
      if (!element) return;

      const { scrollTop, scrollHeight } = scrollState;
      const clientHeight = element.clientHeight;

      // 如果内容高度小于等于容器高度，说明没有滚动空间，不需要加载更多
      if (scrollHeight <= clientHeight) {
        return;
      }

      // 检查是否滚动到顶部附近（距离顶部小于阈值）
      const distanceFromTop = scrollTop;

      if (distanceFromTop <= loadMoreThreshold) {
        isLoadingRef.current = true;
        onLoadMoreMessages?.(scrollTop, scrollTo);

        // 重置加载状态，避免重复触发
        setTimeout(() => {
          isLoadingRef.current = false;
        }, 1000);
      }
    };

    // 延迟执行，确保 scrollToBottom 完成后再检查
    const timeoutId = setTimeout(() => {
      handleScroll();
    }, 150);

    // 清理函数
    return () => {
      clearTimeout(timeoutId);
      isLoadingRef.current = false;
    };
  }, [
    enabled,
    onLoadMoreMessages,
    loadMoreThreshold,
    scrollState,
    scrollElementRef,
    scrollTo,
  ]);

  return {
    isLoading: isLoadingRef.current,
  };
}
