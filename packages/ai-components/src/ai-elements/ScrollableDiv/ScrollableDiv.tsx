import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConversationScrollButton } from '../conversation';
import { ScrollProvider, useScrollContext } from './scrollContext';
import {
  useAutoScrollToBottom,
  useContainerResize,
  useContentResize,
  useHeightChangeTracking,
  useLoadMoreOnScroll,
  useScrollTriggers,
} from './useScrollBehavior';

export type ScrollableDivType = {
  className?: string; // 外层容器样式
  autoScrollToBottom?: boolean; // 初始化是否自动滚动到底部
  enableLoadMore?: boolean; // 启用滚动加载更多
  onLoadMoreMessages?: (
    scrollTop: number,
    scrollTo: (options?: ScrollToOptions) => void
  ) => void; // 触发滚动加载更多的回调
  scrollingDirection?: 'vertical' | 'horizontal' | 'both';
  smoothScrollDuration?: number; // 平滑滚动持续时间
  onScroll?: () => void;
  scrollToBottomTrigger?: unknown; // 触发滚动到底部的 key
  resetScrollable?: () => void; // 触发重置滚动位置到顶部
  resetScrollableSize?: () => void; // 触发重置滚动大小
  scrollToBottomOnContainerHeightChange?: boolean; // 当容器高度变化时滚动到底部
  triggerOnHeightChange?: boolean; // 触发滚动回调 on 高度变化
  disableScroll?: boolean; // 禁止滚动
  disableAutoSizing?: boolean; // 禁止自动调整大小
  style?: React.CSSProperties; // 外层容器样式
  childStyle?: React.CSSProperties; // 滚动元素样式
  contentStyle?: React.CSSProperties; // 内容容器样式
  innerContainerStyle?: React.CSSProperties; // 内层容器样式
  innerContainerClass?: string; // 内层容器样式
  innerContainerDivProps?: React.HTMLAttributes<HTMLDivElement>; // 内层容器 div 属性
  setContainerRef?: (ref: HTMLDivElement | null) => void; // 获取容器 ref 的回调
  loadMoreThreshold?: number; // 距离顶部触发加载更多的阈值
  children?: React.ReactNode;
};

/**
 * Inner component that uses the scroll context
 */

function ScrollableDivInner(props: ScrollableDivType) {
  const {
    children,
    scrollingDirection = 'vertical',
    smoothScrollDuration = 0,
    onScroll,
    scrollToBottomTrigger,
    resetScrollable,
    resetScrollableSize,
    autoScrollToBottom = false,
    scrollToBottomOnContainerHeightChange = false,
    triggerOnHeightChange = false,
    disableScroll = false,
    disableAutoSizing = false,
    style,
    className = '',
    childStyle,
    contentStyle,
    innerContainerStyle,
    innerContainerClass,
    innerContainerDivProps,
    setContainerRef,
    // 新增上拉加载相关 props
    onLoadMoreMessages,
    loadMoreThreshold = 100,
    enableLoadMore = false,
  } = props;

  const {
    scrollElementRef,
    scrollState,
    updateScrollDimensions,
    checkIfAtBottom,
    scrollToBottom,
  } = useScrollContext();

  const outerContainerRef = useRef<HTMLDivElement | null>(null);
  const contentContainerRef = useRef<HTMLDivElement | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Auto scroll to bottom
  useAutoScrollToBottom(autoScrollToBottom, contentContainerRef);

  // 初始化完成后设置状态
  useEffect(() => {
    if (scrollElementRef.current && autoScrollToBottom) {
      // 延迟设置初始化完成，确保滚动和状态更新完成
      const timeoutId = setTimeout(() => {
        setIsInitialized(true);
      }, 200);

      return () => clearTimeout(timeoutId);
    } else if (scrollElementRef.current) {
      // 如果没有自动滚动，立即设置初始化完成
      setIsInitialized(true);
    }
  }, [scrollElementRef, autoScrollToBottom]);

  // Scroll triggers
  useScrollTriggers({
    scrollToBottomTrigger,
    resetScrollable,
    smoothScrollDuration,
  });

  // Height change tracking
  useHeightChangeTracking(contentContainerRef, triggerOnHeightChange, onScroll);

  // Load more on scroll up - 只有在初始化完成后才启用
  useLoadMoreOnScroll({
    onLoadMoreMessages,
    loadMoreThreshold,
    enabled: enableLoadMore && isInitialized,
  });

  // Container resize
  useContainerResize({
    outerContainerRef,
    scrollElementRef,
    scrollingDirection,
    scrollToBottomOnContainerHeightChange,
    checkIfAtBottom,
    scrollToBottom,
    updateScrollDimensions,
  });

  // Content resize
  useContentResize(
    contentContainerRef,
    scrollElementRef,
    ({ width, height }) => {
      updateScrollDimensions({
        scrollWidth: width,
        scrollHeight: height,
      });
    }
  );

  // Reset scrollable size
  useEffect(() => {
    if (resetScrollableSize !== undefined) {
      if (!contentContainerRef.current) return;

      const parent = contentContainerRef.current.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      if (rect) {
        updateScrollDimensions({
          scrollWidth: rect.width,
          scrollHeight: rect.height,
        });
      }
    }
  }, [resetScrollableSize, updateScrollDimensions]);

  // Container style based on scrolling direction
  const containerStyle = useMemo(() => {
    if (scrollingDirection === 'vertical') {
      return {
        width: '100%',
        minHeight: '100%',
      };
    } else if (scrollingDirection === 'horizontal') {
      return {
        height: '100%',
        minWidth: '100%',
      };
    }
    return undefined;
  }, [scrollingDirection]);

  // Content style based on scrolling direction
  const computedContentStyle = useMemo<React.CSSProperties>(() => {
    if (scrollingDirection === 'both') {
      return { overflow: 'hidden' };
    } else if (scrollingDirection === 'horizontal') {
      return { overflowX: 'hidden', height: '100%' };
    } else {
      return { overflowY: 'hidden', width: '100%' };
    }
  }, [scrollingDirection]);

  // Scrolling class for CSS
  const scrollingClass = scrollState.isScrolling ? 'is-scrolling' : '';

  // Handle scroll event from the scroll container
  const onScrollCallback = useCallback(() => {
    if (scrollElementRef.current) {
      const element = scrollElementRef.current;
      updateScrollDimensions({
        scrollTop: element.scrollTop,
        scrollLeft: element.scrollLeft,
        scrollHeight: element.scrollHeight,
        scrollWidth: element.scrollWidth,
        clientHeight: element.clientHeight,
        clientWidth: element.clientWidth,
      });
    }
    onScroll?.();
  }, [scrollElementRef, updateScrollDimensions, onScroll]);

  // Auto-sizing based on scroll direction
  const autoSizeStyle = useMemo(() => {
    if (disableAutoSizing) return {};

    if (scrollingDirection === 'horizontal') {
      return { height: '100%', width: 'unset' };
    } else if (scrollingDirection === 'vertical') {
      return { width: '100%', height: '100%' };
    } else {
      return { width: 'unset', height: 'unset' };
    }
  }, [disableAutoSizing, scrollingDirection]);

  // Scroll disabled style
  const scrollStyle = useMemo<React.CSSProperties>(() => {
    if (disableScroll) {
      return {
        overflow: 'hidden',
      };
    }

    if (scrollingDirection === 'horizontal') {
      return {
        overflowX: 'auto',
        overflowY: 'hidden',
      };
    } else if (scrollingDirection === 'vertical') {
      return {
        overflowY: 'auto',
        overflowX: 'hidden',
      };
    } else if (scrollingDirection === 'both') {
      return {
        overflow: 'auto',
      };
    }

    return {};
  }, [disableScroll, scrollingDirection]);

  return (
    <div
      ref={(el) => {
        outerContainerRef.current = el;
        setContainerRef?.(el);
      }}
      className={`scrollable-div-container ${className} ${scrollingClass}`}
      style={{ ...style }}
    >
      <div
        ref={scrollElementRef}
        onScroll={onScrollCallback}
        style={{
          ...computedContentStyle,
          ...contentStyle,
          ...autoSizeStyle,
          ...scrollStyle,
          ...childStyle,
        }}
        {...innerContainerDivProps}
      >
        <div
          ref={contentContainerRef}
          style={{
            display: 'inline-block',
            ...(containerStyle ?? {}),
            ...(innerContainerStyle ?? {}),
          }}
          className={innerContainerClass}
        >
          {children}
        </div>
      </div>

      {/* 滚动到底部按钮 */}
      <ConversationScrollButton isAtBottom={scrollState.isAtBottom} />
    </div>
  );
}

export function ScrollableDiv(props: ScrollableDivType) {
  return (
    <ScrollProvider>
      <ScrollableDivInner {...props} />
    </ScrollProvider>
  );
}
