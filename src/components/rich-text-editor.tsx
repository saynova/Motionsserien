import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { BackgroundColor, Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import { useEffect } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Highlighter,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Palette,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";

const SIZES = ["11px", "12px", "14px", "16px", "18px", "22px", "28px"];

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
};

export function RichTextEditor({ value, onChange, placeholder, minHeight = 160 }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
      TextStyle,
      Color,
      BackgroundColor,
      FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "prose-sm max-w-none px-3 py-2 text-sm focus:outline-none [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-primary [&_a]:underline",
        style: `min-height:${minHeight}px`,
        "aria-label": placeholder ?? "Message",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  useEffect(() => {
    if (editor && value === "" && !editor.isEmpty) editor.commands.clearContent();
  }, [editor, value]);

  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            underline: editor.isActive("underline"),
            strike: editor.isActive("strike"),
            bullet: editor.isActive("bulletList"),
            ordered: editor.isActive("orderedList"),
            link: editor.isActive("link"),
            left: editor.isActive({ textAlign: "left" }),
            center: editor.isActive({ textAlign: "center" }),
            right: editor.isActive({ textAlign: "right" }),
            size: (editor.getAttributes("textStyle")["fontSize"] as string | undefined) ?? "",
          }
        : null,
  });

  if (!editor) {
    return <div className="rounded border border-input bg-background" style={{ minHeight }} />;
  }

  const b = (active: boolean | undefined) =>
    `inline-flex h-8 w-8 items-center justify-center rounded transition-colors ${
      active ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
    }`;

  function setLink() {
    const prev = editor!.getAttributes("link")["href"] as string | undefined;
    const url = window.prompt("Link address (https://…)", prev ?? "https://");
    if (url === null) return;
    if (url.trim() === "" ) editor!.chain().focus().unsetLink().run();
    else editor!.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  return (
    <div className="rounded border border-input bg-background">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border p-1">
        <select
          aria-label="Font size"
          className="h-8 rounded border border-input bg-background px-1 text-xs"
          value={state?.size ?? ""}
          onChange={(e) =>
            e.target.value
              ? editor.chain().focus().setFontSize(e.target.value).run()
              : editor.chain().focus().unsetFontSize().run()
          }
        >
          <option value="">Size</option>
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {s.replace("px", "")}
            </option>
          ))}
        </select>
        <button type="button" title="Bold" className={b(state?.bold)} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></button>
        <button type="button" title="Italic" className={b(state?.italic)} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></button>
        <button type="button" title="Underline" className={b(state?.underline)} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></button>
        <button type="button" title="Strikethrough" className={b(state?.strike)} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></button>
        <label title="Text colour" className={`${b(false)} relative cursor-pointer`}>
          <Palette className="h-4 w-4" />
          <input type="color" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} />
        </label>
        <label title="Highlight colour" className={`${b(false)} relative cursor-pointer`}>
          <Highlighter className="h-4 w-4" />
          <input type="color" defaultValue="#fff59d" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => editor.chain().focus().setBackgroundColor(e.target.value).run()} />
        </label>
        <span className="mx-1 h-5 w-px bg-border" />
        <button type="button" title="Bulleted list" className={b(state?.bullet)} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></button>
        <button type="button" title="Numbered list" className={b(state?.ordered)} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></button>
        <button type="button" title="Align left" className={b(state?.left)} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft className="h-4 w-4" /></button>
        <button type="button" title="Align centre" className={b(state?.center)} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter className="h-4 w-4" /></button>
        <button type="button" title="Align right" className={b(state?.right)} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight className="h-4 w-4" /></button>
        <button type="button" title="Link" className={b(state?.link)} onClick={setLink}><LinkIcon className="h-4 w-4" /></button>
        <button type="button" title="Clear formatting" className={b(false)} onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><Eraser className="h-4 w-4" /></button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
