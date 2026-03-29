import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  Code as CodeIcon, 
  List, 
  ListOrdered, 
  Quote, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Link as LinkIcon,
  Image as ImageIcon,
  Upload,
  Video as VideoIcon,
  Table as TableIcon,
  Plus,
  Minus,
  Code2,
  MinusSquare,
  CornerDownLeft,
  Undo,
  Redo,
  Loader2
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export interface TipTapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editor) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    let errorMessages: string[] = [];

    try {
      let uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Limit size to 5MB
        if (file.size > 5 * 1024 * 1024) {
          errorMessages.push(`Bỏ qua '${file.name}': Vượt quá 5MB`);
          continue;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `content_${Math.random().toString(36).substring(2, 11)}_${Date.now()}.${fileExt}`;
        const filePath = `content/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("posts")
          .upload(filePath, file);

        if (uploadError) {
          errorMessages.push(`Lỗi tải '${file.name}': ${uploadError.message}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("posts")
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      if (uploadedUrls.length > 0) {
        const content = uploadedUrls.map(url => ({
          type: 'image',
          attrs: { src: url }
        }));
        editor.commands.insertContent(content);
      }

      if (errorMessages.length > 0) {
        alert("Một số ảnh bị lỗi:\n" + errorMessages.join("\n"));
      }
    } catch (err: any) {
      console.error("Error uploading image:", err);
      alert("Lỗi khi tải ảnh lên: " + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const addImageUrl = useCallback(() => {
    if (!editor) return;
    const urlInput = window.prompt("Nhập URL hình ảnh (Nếu nhiều ảnh, hãy cách nhau bằng dấu phẩy hoặc dấu cách):");
    
    if (urlInput !== null) {
      // Split by spaces, commas, or newlines, and filter out empty strings
      const urls = urlInput.split(/[\s,]+/).filter(u => u.trim() !== "");
      if (urls.length === 0) return;
      
      let failCount = 0;
      let validUrls: string[] = [];

      for (const url of urls) {
        try {
          // Validate URL format (will throw error if invalid)
          const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
          validUrls.push(parsedUrl.href);
        } catch (e) {
          failCount++;
        }
      }

      if (validUrls.length > 0) {
        const content = validUrls.map(url => ({
          type: 'image',
          attrs: { src: url }
        }));
        editor.commands.insertContent(content);
      }

      if (failCount > 0) {
        alert(`Đã chèn thành công ${validUrls.length} ảnh. Có ${failCount} URL không hợp lệ.`);
      }
    }
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
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
    if (!editor) return;
    const embedCode = window.prompt("Nhập mã nhúng (Embed HTML) của Iframe hoặc Video:");
    if (embedCode) {
      editor.commands.insertContent(embedCode);
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  const btnClass = (isActive: boolean) =>
    `p-2 rounded text-sm font-medium transition-all ${
      isActive
        ? "bg-amber-100 text-amber-800 shadow-sm"
        : "text-stone-600 hover:bg-stone-100"
    }`;

  return (
    <div className="flex flex-wrap gap-1 p-1">
      <input 
        type="file" 
        multiple
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Text Style */}
      <div className="flex gap-0.5 border-r border-stone-200 pr-2 mr-1">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive("bold"))} title="In đậm">
          <Bold className="size-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive("italic"))} title="In nghiêng">
          <Italic className="size-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnClass(editor.isActive("underline"))} title="Gạch chân">
          <UnderlineIcon className="size-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive("strike"))} title="Gạch ngang">
          <Strikethrough className="size-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={btnClass(editor.isActive("code"))} title="Code Inline">
          <CodeIcon className="size-4" />
        </button>
      </div>

      {/* Headings */}
      <div className="flex gap-0.5 border-r border-stone-200 pr-2 mr-1 text-[10px] font-bold">
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btnClass(editor.isActive("heading", { level: 1 }))} title="H1">
          H1
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive("heading", { level: 2 }))} title="H2">
          H2
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btnClass(editor.isActive("heading", { level: 3 }))} title="H3">
          H3
        </button>
      </div>

      {/* Lists */}
      <div className="flex gap-0.5 border-r border-stone-200 pr-2 mr-1">
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive("bulletList"))} title="Danh sách">
          <List className="size-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive("orderedList"))} title="Danh sách số">
          <ListOrdered className="size-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnClass(editor.isActive("blockquote"))} title="Trích dẫn">
          <Quote className="size-4" />
        </button>
      </div>

      {/* Text Alignment */}
      <div className="flex gap-0.5 border-r border-stone-200 pr-2 mr-1">
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("left").run()} className={btnClass(editor.isActive({ textAlign: "left" }))} title="Căn trái">
          <AlignLeft className="size-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("center").run()} className={btnClass(editor.isActive({ textAlign: "center" }))} title="Căn giữa">
          <AlignCenter className="size-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("right").run()} className={btnClass(editor.isActive({ textAlign: "right" }))} title="Căn phải">
          <AlignRight className="size-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("justify").run()} className={btnClass(editor.isActive({ textAlign: "justify" }))} title="Căn đều">
          <AlignJustify className="size-4" />
        </button>
      </div>

      {/* Links and Media */}
      <div className="flex gap-0.5 border-r border-stone-200 pr-2 mr-1">
        <button type="button" onClick={setLink} className={btnClass(editor.isActive("link"))} title="Liên kết">
          <LinkIcon className="size-4" />
        </button>
        <button 
          type="button" 
          onClick={() => fileInputRef.current?.click()} 
          className={btnClass(false)} 
          disabled={isUploading}
          title="Tải ảnh từ máy tính"
        >
          {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        </button>
        <button type="button" onClick={addImageUrl} className={btnClass(false)} title="Chèn ảnh qua URL">
          <ImageIcon className="size-4" />
        </button>
        <button type="button" onClick={insertEmbedCode} className={btnClass(false)} title="Nhúng Video / Iframe">
          <VideoIcon className="size-4" />
        </button>
      </div>

      {/* Table */}
      <div className="flex gap-0.5 border-r border-stone-200 pr-2 mr-1">
        <button type="button" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className={btnClass(false)} title="Chèn bảng">
          <TableIcon className="size-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} className={btnClass(false)} title="Thêm cột">
          <Plus className="size-3" />|
        </button>
        <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} className={btnClass(false)} title="Thêm hàng">
          <Plus className="size-3" />-
        </button>
        <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} className={btnClass(false)} title="Xóa bảng">
          <MinusSquare className="size-4 text-rose-500" />
        </button>
      </div>

      {/* History */}
      <div className="flex gap-0.5">
        <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().chain().focus().undo().run()} className={`${btnClass(false)} disabled:opacity-30`} title="Hoàn tác">
          <Undo className="size-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().chain().focus().redo().run()} className={`${btnClass(false)} disabled:opacity-30`} title="Làm lại">
          <Redo className="size-4" />
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
        allowBase64: true,
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg block my-4",
          style: "max-width: 100%; height: auto;",
          loading: "lazy",
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
