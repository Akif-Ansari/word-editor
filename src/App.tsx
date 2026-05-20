import { RichTextEditor } from './components/Editor/RichTextEditor'

function App() {
  return (
    <div className="h-screen bg-linear-to-br from-slate-100 to-blue-50 flex flex-col overflow-hidden">
      {/* Editor — header is fully controlled via the `header` prop */}
      <main className="flex-1 min-h-0">
        <RichTextEditor
          className="h-full "
          features={{ import: true }}
          header={{
            show: true,
            showLogo: true,
            showTitle: true,
            title: 'Examly Word Editor',
            showDescription: true,
            description: 'Rich Text Document Editor',
            // rightSlot: <button>Save</button>,  // example: add custom right-side content
          }}
        />
      </main>
    </div>
  )
}

export default App
