/**
 * AskUserQuestionTool - 交互式问题卡片
 *
 * 渲染 Agent 的 AskUserQuestion 工具调用，展示选项让用户选择。
 * 30 秒倒计时进度条，超时后 Agent 自动决策。
 *
 * option.action 支持：点击带 action 的选项时，不提交 answer 给后端，
 * 直接 stop 当前流 + 切换 agent + 发送消息。
 */

import type {
  AskUserQuestion,
  AskUserQuestionInput,
  AskUserQuestionOptionAction,
  UserQuestionAnswer,
} from '@cortex/shared/types/ask-user-question';
import { cn } from '@cortex/ui';
import type { ToolUIPart, UITools } from 'ai';
import {
  CheckIcon,
  ClockIcon,
  MessageCircleQuestionIcon,
  SendIcon,
} from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ToolRendererProps } from './tool-registry';

const TIMEOUT_MS = 30_000;

interface QuestionCardProps {
  question: AskUserQuestion;
  questionIndex: number;
  onAnswer: (answer: UserQuestionAnswer) => void;
  onAction?: (action: AskUserQuestionOptionAction) => void;
  disabled: boolean;
  /** 重新打开已完成任务时用于恢复的历史选中 label */
  initialSelectedLabels?: string[];
  /** 重新打开已完成任务时用于恢复的"其他"自由文本 */
  initialFreeText?: string;
}

function QuestionCard({
  question,
  questionIndex,
  onAnswer,
  onAction,
  disabled,
  initialSelectedLabels,
  initialFreeText,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelectedLabels ?? [])
  );
  const [freeText, setFreeText] = useState(initialFreeText ?? '');
  const [showOther, setShowOther] = useState(Boolean(initialFreeText));

  const handleOptionClick = useCallback(
    (opt: { label: string; action?: AskUserQuestionOptionAction }) => {
      if (disabled) return;
      if (question.multiSelect) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(opt.label)) next.delete(opt.label);
          else next.add(opt.label);
          return next;
        });
        setShowOther(false);
      } else {
        setSelected(new Set([opt.label]));
        setShowOther(false);
        if (opt.action && onAction) {
          onAction(opt.action);
        } else {
          onAnswer({
            questionIndex,
            selectedLabels: [opt.label],
          });
        }
      }
    },
    [disabled, question.multiSelect, questionIndex, onAnswer, onAction]
  );

  const handleOtherClick = useCallback(() => {
    if (disabled) return;
    setShowOther(true);
    setSelected(new Set());
  }, [disabled]);

  const handleOtherSubmit = useCallback(() => {
    if (!freeText.trim()) return;
    onAnswer({
      questionIndex,
      selectedLabels: [],
      freeText: freeText.trim(),
    });
  }, [freeText, questionIndex, onAnswer]);

  const handleMultiSubmit = useCallback(() => {
    if (selected.size === 0) return;
    onAnswer({
      questionIndex,
      selectedLabels: [...selected],
    });
  }, [selected, questionIndex, onAnswer]);

  return (
    <div className="mb-3 last:mb-0">
      <span className="inline-block rounded bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground mb-1.5">
        {question.header}
      </span>
      <p className="text-sm text-foreground mb-2">{question.question}</p>

      <div className="flex flex-col gap-1.5">
        {(Array.isArray(question.options) ? question.options : []).map(
          (opt) => {
            const isSelected = selected.has(opt.label);
            return (
              <button
                key={opt.label}
                type="button"
                disabled={disabled}
                onClick={() => handleOptionClick(opt)}
                className={cn(
                  'flex items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border hover:border-primary/40 hover:bg-muted/50',
                  disabled && !isSelected && 'opacity-50 cursor-default',
                  !disabled && 'cursor-pointer'
                )}
              >
                <div
                  className={cn(
                    'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30'
                  )}
                >
                  {isSelected && <CheckIcon className="size-2.5" />}
                </div>
                <div className="min-w-0">
                  <span className="text-[13px] font-medium text-foreground">
                    {opt.label}
                  </span>
                  {opt.description && (
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {opt.description}
                    </span>
                  )}
                </div>
              </button>
            );
          }
        )}

        {!disabled && !showOther && (
          <button
            type="button"
            onClick={handleOtherClick}
            className="rounded-lg border border-dashed border-border px-3 py-2 text-left text-[13px] text-muted-foreground hover:border-primary/40 hover:bg-muted/50 transition-colors cursor-pointer"
          >
            其他...
          </button>
        )}

        {disabled && initialFreeText && (
          <div className="rounded-lg border border-primary bg-primary/5 px-3 py-2 text-[13px] text-foreground">
            {initialFreeText}
          </div>
        )}

        {showOther && !disabled && (
          <div className="flex gap-1.5">
            <input
              type="text"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleOtherSubmit()}
              placeholder="输入你的回答..."
              className="flex-1 rounded-lg border border-border px-3 py-1.5 text-[13px] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-background"
            />
            <button
              type="button"
              onClick={handleOtherSubmit}
              disabled={!freeText.trim()}
              className={cn(
                'rounded-lg px-3 py-1.5 text-[13px] transition-colors',
                freeText.trim()
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer'
                  : 'bg-muted text-muted-foreground cursor-default'
              )}
            >
              <SendIcon className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {question.multiSelect && !disabled && selected.size > 0 && (
        <button
          type="button"
          onClick={handleMultiSubmit}
          className="mt-2 rounded-lg bg-primary px-4 py-1.5 text-[13px] text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
        >
          确认 ({selected.size} 项已选)
        </button>
      )}
    </div>
  );
}

function CountdownBar({
  remainingMs,
  totalMs,
}: {
  remainingMs: number;
  totalMs: number;
}) {
  const progress = Math.max(0, remainingMs / totalMs);
  const seconds = Math.ceil(remainingMs / 1000);

  return (
    <div className="mt-2">
      <div className="h-[3px] rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-100 ease-linear',
            remainingMs < 5000
              ? 'bg-destructive'
              : remainingMs < 10000
                ? 'bg-amber-500'
                : 'bg-primary'
          )}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground mt-1 text-right">
        {seconds}s 后 Agent 将自动决策
      </p>
    </div>
  );
}

export const AskUserQuestionTool = memo(
  function AskUserQuestionTool({
    part,
    status,
    onSwitchAgent,
  }: ToolRendererProps) {
    const typedPart = part as ToolUIPart<UITools>;
    const input = ('input' in typedPart ? typedPart.input : undefined) as
      | AskUserQuestionInput
      | undefined;
    const state = 'state' in typedPart ? typedPart.state : undefined;
    const toolCallId =
      'toolCallId' in typedPart ? (typedPart.toolCallId as string) : undefined;

    const raw = input?.questions;
    const questions = Array.isArray(raw)
      ? raw.filter(
          (q): q is AskUserQuestion =>
            q != null &&
            typeof q.question === 'string' &&
            typeof q.header === 'string'
        )
      : [];
    const isCompleted =
      state === 'output-available' || state === 'output-error';

    // 重新打开已完成的任务时，从 input.answers 恢复用户历史选择
    // canUseTool updatedInput 把 answers 注入 input，形如 { "q#0: 问题": "Label1, Label2" }
    const restoredAnswers = useMemo(() => {
      const map = new Map<number, UserQuestionAnswer>();
      const answers = (
        input as { answers?: Record<string, string> } | undefined
      )?.answers;
      if (!answers || typeof answers !== 'object' || questions.length === 0) {
        return map;
      }
      for (const [key, value] of Object.entries(answers)) {
        if (typeof value !== 'string') continue;
        const match = key.match(/^q#(\d+):/);
        if (!match) continue;
        const idx = Number.parseInt(match[1], 10);
        const q = questions[idx];
        if (!q) continue;
        const optionLabels = new Set(
          (Array.isArray(q.options) ? q.options : []).map((o) => o.label)
        );
        // 兼容 ask-user-state.ts 的编码："freeText 或 selectedLabels.join(', ')"
        const parts = value.split(', ').filter(Boolean);
        const allAreOptions =
          parts.length > 0 && parts.every((p) => optionLabels.has(p));
        map.set(
          idx,
          allAreOptions
            ? { questionIndex: idx, selectedLabels: parts }
            : { questionIndex: idx, selectedLabels: [], freeText: value }
        );
      }
      return map;
    }, [input, questions]);

    const [submittedAnswers, setSubmittedAnswers] = useState<
      Map<number, UserQuestionAnswer>
    >(() => (isCompleted ? new Map(restoredAnswers) : new Map()));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSwitching, setIsSwitching] = useState(false);
    const [isExpired, setIsExpired] = useState(false);
    const [remainingMs, setRemainingMs] = useState(TIMEOUT_MS);
    const allAnswered =
      submittedAnswers.size === questions.length || isSubmitting || isSwitching;
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    // 只在卡片可见时才开始倒计时，避免卡片在视口外时 30 秒白白流逝
    useEffect(() => {
      if (isCompleted || !cardRef.current) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        { threshold: 0.3 }
      );
      observer.observe(cardRef.current);
      return () => observer.disconnect();
    }, [isCompleted]);

    useEffect(() => {
      if (!isVisible || isCompleted || allAnswered || isExpired) return;
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, TIMEOUT_MS - elapsed);
        setRemainingMs(remaining);
        if (remaining <= 0) {
          setIsExpired(true);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }, 100);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }, [isVisible, isCompleted, allAnswered, isExpired]);

    // 超时 → 自动执行第一个 switch-agent action
    const switchExecutedRef = useRef(false);
    useEffect(() => {
      if (!isExpired || switchExecutedRef.current || !onSwitchAgent) return;
      for (const q of questions) {
        for (const opt of q.options ?? []) {
          if (opt.action?.type === 'switch-agent') {
            switchExecutedRef.current = true;
            setIsSwitching(true);
            onSwitchAgent({
              agentName: opt.action.agentName,
              message: opt.action.message ?? '',
            });
            return;
          }
        }
      }
    }, [isExpired, questions, onSwitchAgent]);

    const projectId = useMemo(() => {
      if (typeof window === 'undefined') return '';
      const match = window.location.pathname.match(/\/next\/([a-zA-Z0-9_-]+)/);
      return match?.[1] ?? '';
    }, []);

    const handleAnswer = useCallback(
      async (answer: UserQuestionAnswer) => {
        const newAnswers = new Map(submittedAnswers);
        newAnswers.set(answer.questionIndex, answer);
        setSubmittedAnswers(newAnswers);

        if (newAnswers.size === questions.length && toolCallId && projectId) {
          setIsSubmitting(true);
          try {
            await fetch('/api/ai-stream-v2/answer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId,
                toolCallId,
                answers: [...newAnswers.values()],
              }),
            });
          } catch (err) {
            console.error('[AskUserQuestion] Submit error:', err);
          }
        }
      },
      [submittedAnswers, questions.length, toolCallId, projectId]
    );

    // 点击带 action 的 option → 不提交 answer，直接 switch
    const handleAction = useCallback(
      (action: AskUserQuestionOptionAction) => {
        if (switchExecutedRef.current || !onSwitchAgent) return;
        if (action.type === 'switch-agent') {
          switchExecutedRef.current = true;
          setIsSwitching(true);
          onSwitchAgent({
            agentName: action.agentName,
            message: action.message ?? '',
          });
        }
      },
      [onSwitchAgent]
    );

    if (!questions.length) return null;

    // 自动路由场景：后端 canUseTool 检测到建站选项并自动回答，
    // 卡片到达前端时 state 已是 output-available，不需要渲染交互卡片。
    // 检查两种情况：显式 action 字段 或 label 匹配已知建站选项
    const KNOWN_BUILD_LABELS = ['开始建站'];
    const hasSwitchAction = questions.some((q) =>
      (Array.isArray(q.options) ? q.options : []).some(
        (o) =>
          o.action?.type === 'switch-agent' ||
          KNOWN_BUILD_LABELS.includes(o.label)
      )
    );
    if (hasSwitchAction && isCompleted) return null;

    const showCountdown =
      isVisible &&
      !isCompleted &&
      !allAnswered &&
      !isExpired &&
      !isSubmitting &&
      !isSwitching;
    const disabled = isCompleted || isSubmitting || isExpired || isSwitching;

    return (
      <div
        ref={cardRef}
        className="mx-4 my-2 rounded-xl border border-border bg-card p-4"
      >
        <div className="flex items-center gap-2 mb-3 text-muted-foreground">
          <MessageCircleQuestionIcon className="size-4" />
          <span className="text-xs font-medium">Agent 想问你</span>
        </div>

        {questions.map((q, i) => {
          const restored = restoredAnswers.get(i);
          return (
            <QuestionCard
              key={`${q.header}-${i}`}
              question={q}
              questionIndex={i}
              onAnswer={handleAnswer}
              onAction={handleAction}
              disabled={disabled || submittedAnswers.has(i)}
              initialSelectedLabels={restored?.selectedLabels}
              initialFreeText={restored?.freeText}
            />
          );
        })}

        {showCountdown && (
          <CountdownBar remainingMs={remainingMs} totalMs={TIMEOUT_MS} />
        )}

        {!isSubmitting && !isSwitching && (isExpired || isCompleted) && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            {restoredAnswers.size > 0 ? (
              <>
                <CheckIcon className="size-3.5" />
                <span>已提交</span>
              </>
            ) : (
              <>
                <ClockIcon className="size-3.5" />
                <span>Agent 已自动决策</span>
              </>
            )}
          </div>
        )}

        {isSubmitting && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-primary">
            <CheckIcon className="size-3.5" />
            <span>已提交</span>
          </div>
        )}

        {isSwitching && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-primary">
            <CheckIcon className="size-3.5" />
            <span>正在切换...</span>
          </div>
        )}
      </div>
    );
  },
  (prev, next) => {
    const prevPart = prev.part as ToolUIPart<UITools>;
    const nextPart = next.part as ToolUIPart<UITools>;
    return (
      prevPart === nextPart &&
      prevPart.state === nextPart.state &&
      prev.status === next.status
    );
  }
);
