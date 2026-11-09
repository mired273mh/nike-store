'use client';
import { useRef } from 'react';
// The PHP API sanitizes formatting again before storage. No pasted HTML is trusted.
export default function RichEditor({
  initialHtml,
  onChange,
}: {
  initialHtml: string;
  onChange: (html: string, text: string) => void;
}) {
  const editor = useRef<HTMLDivElement>(null);
  function update() {
    if (editor.current) onChange(editor.current.innerHTML, editor.current.innerText);
  }
  const commands = [
    ['bold', 'Đậm'],
    ['italic', 'Nghiêng'],
    ['underline', 'Gạch chân'],
    ['insertUnorderedList', 'Danh sách'],
    ['removeFormat', 'Xóa định dạng'],
  ];
  return (
    <div className="border rounded">
      <div className="flex flex-wrap gap-1 p-2 border-b bg-muted">
        {commands.map(([command, label]) => (
          <button
            type="button"
            key={command}
            className="border bg-background text-xs px-2 py-1"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              editor.current?.focus();
              document.execCommand(command);
              update();
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        ref={editor}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Mô tả sản phẩm"
        aria-multiline="true"
        className="p-3 min-h-36 outline-none prose-editor"
        dangerouslySetInnerHTML={{ __html: initialHtml }}
        onInput={update}
        onPaste={(e) => {
          e.preventDefault();
          document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
          update();
        }}
      />
    </div>
  );
}
