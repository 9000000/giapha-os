"use client";

import React, { useCallback, useEffect } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Heading from "@tiptap/extension-heading";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import Blockquote from "@tiptap/extension-blockquote";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import Strike from "@tiptap/extension-strike";
import Code from "@tiptap/extension-code";
import CodeBlock from "@tiptap/extension-code-block";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Placeholder from "@tiptap/extension-placeholder";
import { Paragraph } from "@tiptap/extension-paragraph";
import { HardBreak } from "@tiptap/extension-hard-break";
import { Iframe, VideoHtml, Source, Track } from "./extensions/MediaExtensions";

export interface TipTapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  const addImage = useCallback(() => {
    const url = window.prompt("Nhập URL hình ảnh:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Nhập URL:", previousUrl);

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const insertEmbedCode = useCallback(() => {
    const embedCode = window.prompt("Nhập mã nhúng (Embed HTML) của Iframe hoặc Video:");
    if (embedCode) {
      editor.commands.insertContent(embedCode);
    }
  }, [editor]);

  const btnClass = (isActive: boolean) =>
    `p-2 rounded text-sm font-medium transition-colors ${
      isActive
        ? "bg-amber-100 text-amber-800"
        : "text-stone-600 hover:bg-stone-100"
    }`;

  return (
    <div className="flex flex-wrap gap-1">
      {/* Text Style */}
      <div className="flex gap-0.5 border-r border-stone-200 pr-2 mr-1">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()} className={btnClass(editor.isActive("bold"))} title="In đậm">
          <strong>B</strong>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()} className={btnClass(editor.isActive("italic"))} title="In nghiêng">
          <em>I</em>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} disabled={!editor.can().chain().focus().toggleUnderline().run()} className={btnClass(editor.isActive("underline"))} title="Gạch chân">
          <u>U</u>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().chain().focus().toggleStrike().run()} className={btnClass(editor.isActive("strike"))} title="Gạch ngang">
          <s>S</s>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} disabled={!editor.can().chain().focus().toggleCode().run()} className={btnClass(editor.isActive("code"))} title="Code">
          &lt;/&gt;
        </button>
      </div>

      {/* Headings */}
      <div className="flex gap-0.5 border-r border-stone-200 pr-2 mr-1">
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btnClass(editor.isActive("heading", { level: 1 }))} title="Heading 1">
          H1
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive("heading", { level: 2 }))} title="Heading 2">
          H2
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btnClass(editor.isActive("heading", { level: 3 }))} title="Heading 3">
          H3
        </button>
        <button type="button" onClick={() => editor.chain().focus().setParagraph().run()} className={btnClass(editor.isActive("paragraph"))} title="Paragraph">
          P
        </button>
      </div>

      {/* Lists */}
      <div className="flex gap-0.5 border-r border-stone-200 pr-2 mr-1">
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive("bulletList"))} title="Danh sách">
          •
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive("orderedList"))} title="Danh sách số">
          1.
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnClass(editor.isActive("blockquote"))} title="Trích dẫn">
          &quot;
        </button>
      </div>

      {/* Text Alignment */}
      <div className="flex gap-0.5 border-r border-stone-200 pr-2 mr-1">
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("left").run()} className={btnClass(editor.isActive({ textAlign: "left" }))} title="Căn trái">
          ⬅
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("center").run()} className={btnClass(editor.isActive({ textAlign: "center" }))} title="Căn giữa">
          ⬌
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("right").run()} className={btnClass(editor.isActive({ textAlign: "right" }))} title="Căn phải">
          ➡
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("justify").run()} className={btnClass(editor.isActive({ textAlign: "justify" }))} title="Căn đều">
          ≡
        </button>
      </div>

      {/* Color */}
      <div className="flex gap-0.5 border-r border-stone-200 pr-2 mr-1">
        <input
          type="color"
          onInput={(event) =>
            editor.chain().focus().setMark("textStyle", { color: (event.target as HTMLInputElement).value }).run()
          }
          value={editor.getAttributes("textStyle").color || "#000000"}
          className="w-8 h-8 rounded cursor-pointer border border-stone-200"
          title="Màu chữ"
        />
      </div>

      {/* Links and Media */}
      <div className="flex gap-0.5 border-r border-stone-200 pr-2 mr-1">
        <button type="button" onClick={setLink} className={btnClass(editor.isActive("link"))} title="Liên kết">
          🔗
        </button>
        <button type="button" onClick={addImage} className={`${btnClass(false)}`} title="Chèn ảnh">
          🖼
        </button>
        <button type="button" onClick={insertEmbedCode} className={`${btnClass(false)}`} title="Nhúng Video / Iframe">
          🎬
        </button>
      </div>

      {/* Table */}
      <div className="flex gap-0.5 border-r border-stone-200 pr-2 mr-1">
        <button type="button" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className={`${btnClass(false)}`} title="Chèn bảng">
          ⊞
        </button>
        <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} className={`${btnClass(false)}`} title="Thêm cột">
          +|
        </button>
        <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} className={`${btnClass(false)}`} title="Thêm hàng">
          +-
        </button>
        <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} className={`${btnClass(false)}`} title="Xóa bảng">
          ⊟
        </button>
      </div>

      {/* Other */}
      <div className="flex gap-0.5 border-r border-stone-200 pr-2 mr-1">
        <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={btnClass(editor.isActive("codeBlock"))} title="Code Block">
          {"</>"}
        </button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={`${btnClass(false)}`} title="Đường kẻ ngang">
          —
        </button>
        <button type="button" onClick={() => editor.chain().focus().setHardBreak().run()} className={`${btnClass(false)}`} title="Xuống dòng">
          ⏎
        </button>
      </div>

      {/* History */}
      <div className="flex gap-0.5">
        <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().chain().focus().undo().run()} className={`${btnClass(false)} disabled:opacity-30`} title="Hoàn tác">
          ↶
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().chain().focus().redo().run()} className={`${btnClass(false)} disabled:opacity-30`} title="Làm lại">
          ↷
        </button>
      </div>
    </div>
  );
};

export function TipTapEditor({
  value,
  onChange,
  placeholder = "Nhập nội dung...",
  readOnly = false,
  className,
}: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        paragraph: false,
      }),
      Paragraph.configure({
        HTMLAttributes: {
          class: "my-paragraph",
        },
      }),
      Heading.configure({
        levels: [1, 2, 3],
      }),
      BulletList,
      OrderedList,
      Blockquote,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline hover:text-blue-800",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyle,
      Color,
      Underline,
      Strike,
      Code,
      CodeBlock,
      HorizontalRule,
      HardBreak,
      Iframe,
      VideoHtml,
      Source,
      Track,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  return (
    <div className={className}>
      {!readOnly && (
        <div className="border border-stone-200 rounded-t-xl p-2 flex flex-wrap gap-1 bg-stone-50/80">
          <MenuBar editor={editor} />
        </div>
      )}
      <div className={`border border-stone-200 ${readOnly ? 'rounded-xl' : 'rounded-b-xl border-t-0'} overflow-hidden bg-white`}>
        <EditorContent editor={editor} className="ProseMirror prose prose-stone max-w-none p-4 min-h-[300px] focus:outline-none [&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:outline-none" />
      </div>
    </div>
  );
}
