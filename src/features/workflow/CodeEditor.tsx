import { useMemo } from 'react';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { useConsole } from '../../lib/console';

const theme = EditorView.theme({ '&': { fontSize: '13px', border: '1px solid #dce2e9', borderRadius: '7px', overflow: 'hidden' }, '&.cm-focused': { outline: '2px solid #315ae8', outlineOffset: '2px' }, '.cm-scroller': { fontFamily: '"SFMono-Regular", Consolas, monospace', lineHeight: '1.7' }, '.cm-gutters': { backgroundColor: '#f7f9fc', color: '#8593a5', borderRight: '1px solid #e5eaf0' }, '.cm-content': { padding: '10px 0' }, '.cm-activeLine': { backgroundColor: '#eef3fc' } });
export default function CodeEditor({ value, onChange, readOnly = false, id }: { value?: string; onChange?: (value: string) => void; readOnly?: boolean; id?: string }) {
  const { t } = useConsole(); const label = t('JavaScript 判断表达式', 'JavaScript decision expression');
  const extensions = useMemo(() => [javascript(), theme, EditorView.lineWrapping, EditorView.contentAttributes.of({ 'aria-label': label, ...(id ? { id } : {}) })], [label, id]);
  return <CodeMirror value={value || ''} onChange={onChange} extensions={extensions} height="260px" maxHeight="400px" theme="light" readOnly={readOnly} editable={!readOnly} indentWithTab={false} basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: !readOnly, autocompletion: !readOnly, bracketMatching: true, closeBrackets: !readOnly, history: true, searchKeymap: true }} aria-label={label}/>;
}
