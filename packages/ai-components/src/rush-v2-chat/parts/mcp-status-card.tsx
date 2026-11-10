'use client';

import type { MCPConnectionStatus } from '@cortex/shared/types/mcp';
import { cn } from '@cortex/ui';
import { ChevronDownIcon } from 'lucide-react';
import {
  type MouseEvent,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Loader } from '../../ai-elements/loader';
import { SKIP_NEXT_AUTO_SCROLL_DATASET_KEY } from '../../ai-elements/ScrollableDiv/constants';

export interface MCPStatusCardProps {
  status: MCPConnectionStatus[];
  totalElapsedMs: number;
  isLoading?: boolean;
}

function getSummaryLabel({
  isLoading,
  allFailed,
  failedCount,
  hasFailures,
  totalTools,
}: {
  isLoading: boolean;
  allFailed: boolean;
  failedCount: number;
  hasFailures: boolean;
  totalTools: number;
}): string {
  if (isLoading) {
    return 'mcp 工具加载中';
  }

  if (allFailed) {
    return `${failedCount} 个 MCP 服务连接失败`;
  }

  if (hasFailures) {
    return `已加载 ${totalTools} 个 MCP 工具，${failedCount} 个服务失败`;
  }

  return `已加载 ${totalTools} 个 MCP 工具`;
}

function getStatusIcon({
  allFailed,
  hasFailures,
}: {
  allFailed: boolean;
  hasFailures: boolean;
}): string {
  if (allFailed) {
    return '✗';
  }

  if (hasFailures) {
    return '!';
  }

  return '✓';
}

function getStatusToneClassName({
  allFailed,
  hasFailures,
  hasLoadedTools,
}: {
  allFailed: boolean;
  hasFailures: boolean;
  hasLoadedTools: boolean;
}): string {
  if (allFailed) {
    return 'bg-red-500/12 text-red-600';
  }

  if (hasFailures) {
    return 'bg-amber-500/10 text-amber-600';
  }

  if (hasLoadedTools) {
    return 'bg-emerald-500/10 text-emerald-600';
  }

  return 'bg-foreground/5 text-foreground/70';
}

export const MCPStatusCard = ({
  status,
  totalElapsedMs,
  isLoading = false,
}: MCPStatusCardProps) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollRestoreRef = useRef<{
    scrollElement: HTMLDivElement;
    scrollTop: number;
  } | null>(null);
  const failedCount = status.filter((s) => !s.success).length;
  const totalTools = status.reduce((sum, s) => sum + s.toolCount, 0);

  const hasFailures = failedCount > 0;
  const allFailed = status.length > 0 && failedCount === status.length;
  const hasLoadedTools = totalTools > 0;
  const hasExpandableDetails = status.length > 0;

  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const isExpanded = hasExpandableDetails && (manualExpanded ?? false);

  const formatTime = (ms: number) => {
    return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
  };

  const summaryLabel = getSummaryLabel({
    isLoading,
    allFailed,
    failedCount,
    hasFailures,
    totalTools,
  });
  const summaryTime =
    !isLoading && totalElapsedMs > 0 ? formatTime(totalElapsedMs) : null;
  const statusIcon = getStatusIcon({ allFailed, hasFailures });

  const captureConversationScroll = useCallback(() => {
    const scrollContainer = cardRef.current?.closest(
      '.scrollable-div-container'
    );
    const scrollElement =
      scrollContainer?.firstElementChild instanceof HTMLDivElement
        ? scrollContainer.firstElementChild
        : null;

    if (!scrollElement) {
      return;
    }

    pendingScrollRestoreRef.current = {
      scrollElement,
      scrollTop: scrollElement.scrollTop,
    };
  }, []);

  const suppressNextAutoScroll = useCallback(() => {
    const scrollContainer = cardRef.current?.closest(
      '.scrollable-div-container'
    );
    const scrollElement =
      scrollContainer?.firstElementChild instanceof HTMLDivElement
        ? scrollContainer.firstElementChild
        : null;

    if (!scrollElement) {
      return;
    }

    scrollElement.dataset[SKIP_NEXT_AUTO_SCROLL_DATASET_KEY] = 'true';
  }, []);

  useLayoutEffect(() => {
    const pending = pendingScrollRestoreRef.current;
    if (manualExpanded === null || !pending) {
      return;
    }

    const { scrollElement, scrollTop } = pending;
    const restore = () => {
      scrollElement.scrollTop = scrollTop;
    };

    restore();

    const rafId = requestAnimationFrame(() => {
      restore();
      requestAnimationFrame(() => {
        restore();
      });
    });

    const timeoutId = window.setTimeout(() => {
      restore();
      pendingScrollRestoreRef.current = null;
    }, 80);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [manualExpanded]);

  const handleMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    if (!hasExpandableDetails) {
      return;
    }

    // Prevent mouse focus from asking the browser to re-align the scroll container.
    event.preventDefault();
    captureConversationScroll();
  };

  if (!isLoading && status.length === 0) {
    return null;
  }

  // Do not show MCP status by default when no tools were loaded successfully.
  if (!isLoading && !hasFailures && !hasLoadedTools) {
    return null;
  }

  return (
    <div
      ref={cardRef}
      className="flex max-h-[200px] flex-col overflow-hidden rounded-xl border border-border/60 bg-background/80 px-3 py-2.5 text-xs backdrop-blur supports-[backdrop-filter]:bg-background/70"
      style={{ overflowAnchor: 'none' }}
    >
      <button
        type="button"
        onMouseDown={handleMouseDown}
        onClick={() => {
          if (!hasExpandableDetails) {
            return;
          }
          captureConversationScroll();
          suppressNextAutoScroll();
          setManualExpanded(!isExpanded);
        }}
        disabled={!hasExpandableDetails}
        aria-expanded={hasExpandableDetails ? isExpanded : undefined}
        title={`工具上下文详情，总耗时 ${formatTime(totalElapsedMs)}`}
        className="flex w-full shrink-0 items-center gap-2 text-left disabled:cursor-default cursor-pointer"
      >
        <div
          className={cn(
            'inline-flex size-5 shrink-0 items-center justify-center',
            isLoading
              ? 'text-muted-foreground/70'
              : cn(
                  'rounded-full text-[11px] font-medium',
                  getStatusToneClassName({
                    allFailed,
                    hasFailures,
                    hasLoadedTools,
                  })
                )
          )}
        >
          {isLoading ? (
            <Loader
              className="text-muted-foreground/70"
              data-testid="mcp-status-loading-spinner"
              size={10}
            />
          ) : (
            statusIcon
          )}
        </div>
        <span className="min-w-0 flex-1 truncate font-medium text-foreground/85">
          {summaryLabel}
          {summaryTime ? ` · ${summaryTime}` : ''}
        </span>

        <ChevronDownIcon
          className={cn(
            'ml-2 size-3.5 shrink-0 text-muted-foreground/55 transition-transform',
            !hasExpandableDetails && 'opacity-40',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {isExpanded && (
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto border-t border-border/60 pt-2">
          <div className="space-y-2 pl-7 pr-1">
            <div className="text-[10px] text-muted-foreground">
              总耗时 {formatTime(totalElapsedMs)}
            </div>
            {status.map((s) => (
              <div key={s.serverName}>
                <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                  <span
                    className={cn(
                      'size-1.5 rounded-full',
                      s.success ? 'bg-emerald-500' : 'bg-amber-500'
                    )}
                  />
                  <span className="font-medium text-foreground/85">
                    {s.serverName}
                  </span>
                  <span className="text-muted-foreground/70">
                    · {formatTime(s.elapsedMs)}
                  </span>
                </div>
                {s.success && s.toolNames.length > 0 && (
                  <div className="flex flex-wrap gap-1 pl-3">
                    {s.toolNames.map((name) => (
                      <code
                        key={name}
                        className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {name}
                      </code>
                    ))}
                  </div>
                )}
                {!s.success && s.error && (
                  <div className="pl-3 text-[10px] text-amber-600">
                    {s.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

MCPStatusCard.displayName = 'MCPStatusCard';
