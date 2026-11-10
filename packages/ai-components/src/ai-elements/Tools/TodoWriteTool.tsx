import type { ToolUIPart, UIDataTypes, UIMessagePart, UITools } from 'ai';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import { memo } from 'react';
import { Tool, ToolContent, ToolHeader } from '../tool';

type TodoItem = {
  content: string;
  status: 'pending' | 'completed' | 'in_progress';
};

/**
 * 从 ToolUIPart 中提取 todos 列表，兼容三种数据格式：
 * 1. output 是对象（dev-preview mock）→ 直接取 output.todos
 * 2. output 是 JSON 字符串（V2 real stream）→ JSON.parse 后取 todos
 * 3. output 是 "[object Object]"（V1 real stream，数据已丢失）→ 尝试 input.todos
 */
function extractTodos(part: ToolUIPart<UITools>): TodoItem[] {
  const { output, input } = part;

  if (typeof output === 'object' && output !== null && 'todos' in output) {
    const todos = (output as { todos?: unknown }).todos;
    if (Array.isArray(todos)) {
      return todos as TodoItem[];
    }
  }

  if (typeof output === 'string') {
    try {
      const parsed = JSON.parse(output) as { todos?: TodoItem[] };
      if (Array.isArray(parsed?.todos)) {
        return parsed.todos;
      }
    } catch {
      // V1 output is "[object Object]" — data is lost, fall through
    }
  }

  // Fallback: try input.todos (populated by AI SDK from tool-input-delta chunks)
  if (
    typeof input === 'object' &&
    input !== null &&
    'todos' in input &&
    Array.isArray((input as { todos?: unknown }).todos)
  ) {
    return (input as { todos: TodoItem[] }).todos;
  }

  return [];
}

export const TodoWriteTool = memo(
  function TodoWriteTool({
    part,
  }: {
    part: UIMessagePart<UIDataTypes, UITools>;
  }) {
    const typedPart = part as ToolUIPart<UITools>;
    const todos = extractTodos(typedPart);

    // 计算完成进度
    const completedCount = todos.filter(
      (todo) => todo.status === 'completed'
    ).length;
    const totalCount = todos.length;
    const progressTitle = `${completedCount} of ${totalCount} done`;

    return (
      <div className="py-1 px-4">
        <Tool defaultOpen={false}>
          <ToolHeader
            title={progressTitle}
            type={typedPart.type}
            state={typedPart.state}
            showBadge={false}
          />
          <ToolContent>
            <div className="space-y-2">
              {todos.map((todo, index) => (
                <div
                  key={`${todo.content}-${todo.status}-${index}`}
                  className="flex items-center gap-3 overflow-hidden"
                  style={{
                    padding: '1em',
                    lineHeight: '1.5',
                    paddingBlock: '0.2rem',
                    margin: '0px',
                    wordBreak: 'normal',
                    whiteSpace: 'pre',
                    wordSpacing: 'normal',
                  }}
                >
                  {todo.status === 'completed' ? (
                    <CheckCircle className="size-4 text-green-600 flex-shrink-0" />
                  ) : todo.status === 'in_progress' ? (
                    <Loader2
                      className="size-4 flex-shrink-0 animate-spin"
                      style={{ color: 'var(--muted-foreground)' }}
                    />
                  ) : (
                    <Circle
                      className="size-4 flex-shrink-0"
                      style={{ color: 'var(--muted-foreground)' }}
                    />
                  )}
                  <span
                    className={`text-sm ${
                      todo.status === 'completed'
                        ? 'line-through text-gray-600'
                        : 'text-gray-700'
                    }`}
                  >
                    {todo.content}
                  </span>
                </div>
              ))}
            </div>
          </ToolContent>
        </Tool>
      </div>
    );
  },
  (prev, next) => {
    const prevPart = prev.part as ToolUIPart<UITools>;
    const nextPart = next.part as ToolUIPart<UITools>;
    return prevPart === nextPart && prevPart.state === nextPart.state;
  }
);
