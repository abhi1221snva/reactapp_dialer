import { forwardRef, useImperativeHandle } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold, Italic, Strikethrough, List, ListOrdered, Undo2, Redo2, Quote,
} from 'lucide-react'

export interface RichEmailEditorRef {
  setContent: (html: string) => void
  getContent: () => string
  isEmpty: () => boolean
}

interface Props {
  onChange: (html: string) => void
  placeholder?: string
}

const TB = 'w-7 h-7 rounded flex items-center justify-center transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed'
const TB_ACTIVE = 'bg-slate-200 text-slate-800'
const TB_IDLE = 'text-slate-500'

export const RichEmailEditor = forwardRef<RichEmailEditorRef, Props>(({ onChange }, ref) => {
  const editor = useEditor({
    extensions: [StarterKit],
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'rich-email-body focus:outline-none min-h-[240px] text-sm text-slate-700 leading-relaxed',
        spellcheck: 'true',
      },
    },
  })

  useImperativeHandle(ref, () => ({
    setContent: (html: string) => {
      if (!editor) return
      // emitUpdate=true ensures onUpdate fires → body state syncs → Send button enabled
      editor.commands.setContent(html || '', { emitUpdate: false })
    },
    getContent: () => editor?.getHTML() ?? '',
    isEmpty: () => editor?.isEmpty ?? true,
  }), [editor, onChange])

  if (!editor) return null

  const btn = (active: boolean) => `${TB} ${active ? TB_ACTIVE : TB_IDLE}`

  return (
    <>
      <style>{`
        .rich-email-body p            { margin: 0 0 0.55em; }
        .rich-email-body p:last-child { margin-bottom: 0; }
        .rich-email-body ul, .rich-email-body ol { padding-left: 1.4em; margin: 0 0 0.55em; }
        .rich-email-body li           { margin-bottom: 0.2em; }
        .rich-email-body ul li        { list-style-type: disc; }
        .rich-email-body ol li        { list-style-type: decimal; }
        .rich-email-body strong       { font-weight: 600; }
        .rich-email-body em           { font-style: italic; }
        .rich-email-body s            { text-decoration: line-through; }
        .rich-email-body h1           { font-size: 1.25em; font-weight: 700; margin: 0.2em 0 0.4em; }
        .rich-email-body h2           { font-size: 1.1em;  font-weight: 700; margin: 0.2em 0 0.4em; }
        .rich-email-body h3           { font-size: 1em;    font-weight: 700; margin: 0.2em 0 0.4em; }
        .rich-email-body a            { color: #0284c7; text-decoration: underline; }
        .rich-email-body blockquote   { border-left: 3px solid #cbd5e1; padding-left: 0.8em; color: #64748b; margin: 0 0 0.55em; }
        .rich-email-body img          { max-width: 100%; height: auto; }
        .rich-email-body br           { display: block; content: ""; }
        .rich-email-body code         { background: #f1f5f9; padding: 0.1em 0.35em; border-radius: 3px; font-size: 0.85em; font-family: monospace; }
        .rich-email-body pre          { background: #f1f5f9; border-radius: 6px; padding: 0.75em 1em; overflow-x: auto; margin: 0 0 0.55em; }
        .rich-email-body pre code     { background: none; padding: 0; }
      `}</style>

      <div className="rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-sky-500/30 focus-within:border-sky-400 transition-all overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-100 bg-slate-50/80">

          <button type="button" title="Bold (Ctrl+B)"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={btn(editor.isActive('bold'))}>
            <Bold size={13} />
          </button>

          <button type="button" title="Italic (Ctrl+I)"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={btn(editor.isActive('italic'))}>
            <Italic size={13} />
          </button>

          <button type="button" title="Strikethrough"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={btn(editor.isActive('strike'))}>
            <Strikethrough size={13} />
          </button>

          <div className="w-px h-4 bg-slate-200 mx-1" />

          <button type="button" title="Bullet list"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={btn(editor.isActive('bulletList'))}>
            <List size={13} />
          </button>

          <button type="button" title="Numbered list"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={btn(editor.isActive('orderedList'))}>
            <ListOrdered size={13} />
          </button>

          <button type="button" title="Blockquote"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={btn(editor.isActive('blockquote'))}>
            <Quote size={13} />
          </button>

          <div className="flex-1" />

          <button type="button" title="Undo (Ctrl+Z)"
            onClick={() => editor.chain().focus().undo().run()}
            className={`${TB} ${TB_IDLE}`}>
            <Undo2 size={13} />
          </button>

          <button type="button" title="Redo (Ctrl+Y)"
            onClick={() => editor.chain().focus().redo().run()}
            className={`${TB} ${TB_IDLE}`}>
            <Redo2 size={13} />
          </button>
        </div>

        {/* Editor canvas */}
        <EditorContent editor={editor} className="px-3 py-2.5" />
      </div>
    </>
  )
})

RichEmailEditor.displayName = 'RichEmailEditor'
