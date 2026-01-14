import React, { useRef, useEffect, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import type { User } from '../types';

interface EditorProps {
    roomId: string;
    user: User;
}

const getRandomColor = () => {
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];
    return colors[Math.floor(Math.random() * colors.length)];
};

export const CodeEditor: React.FC<EditorProps> = ({ roomId, user }) => {
    const editorRef = useRef<any>(null);
    const [provider, setProvider] = useState<WebsocketProvider | null>(null);
    const [binding, setBinding] = useState<MonacoBinding | null>(null);
    const [doc, setDoc] = useState<Y.Doc | null>(null);
    const [language, setLanguage] = useState('javascript');
    const [yOutput, setYOutput] = useState<Y.Text | null>(null);
    const [activeUsers, setActiveUsers] = useState<any[]>([]);
    const [output, setOutput] = useState<string>('');
    const [isRunning, setIsRunning] = useState(false);

    // Refs
    const languageRef = useRef(language);
    const runCodeRef = useRef<() => void>(() => { });

    useEffect(() => {
        languageRef.current = language;
    }, [language]);

    useEffect(() => {
        return () => {
            if (provider) provider.destroy();
            if (binding) binding.destroy();
            if (doc) doc.destroy();
        };
    }, []);

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        const ydoc = new Y.Doc();
        setDoc(ydoc);

        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
        const wsProvider = new WebsocketProvider(wsUrl, roomId, ydoc);
        setProvider(wsProvider);

        const color = getRandomColor();
        wsProvider.awareness.setLocalStateField('user', {
            name: user.name,
            avatar: user.avatar,
            color: color
        });

        wsProvider.awareness.on('change', () => {
            const states = wsProvider.awareness.getStates();
            const users = Array.from(states.values()).map((state: any) => state.user).filter(Boolean);
            setActiveUsers(users);
        });

        const yText = ydoc.getText('monaco');
        const outputText = ydoc.getText('output');
        setYOutput(outputText);

        const monacoBinding = new MonacoBinding(
            yText,
            editor.getModel()!,
            new Set([editor]),
            wsProvider.awareness
        );
        setBinding(monacoBinding);

        // Initial Sync
        wsProvider.on('sync', (isSynced: boolean) => {
            if (isSynced) {
                if (yText.toString() === '') {
                    yText.insert(0, '// Welcome to Colab Code!\nconsole.log("Hello World");');
                }
            }
        });

        // Sync Output
        outputText.observe(() => {
            setOutput(outputText.toString());
        });
        setOutput(outputText.toString());

        // Register Shortcut
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            runCodeRef.current();
        });
    };

    const runCode = async () => {
        if (!editorRef.current || !yOutput) return;
        setIsRunning(true);

        const sourceCode = editorRef.current.getValue();
        const currentLang = languageRef.current;

        // Handle HTML/CSS Preview locally
        if (currentLang === 'html') {
            yOutput.delete(0, yOutput.length);
            yOutput.insert(0, sourceCode);
            setIsRunning(false);
            return;
        }

        // Optimistic update
        yOutput.delete(0, yOutput.length);
        yOutput.insert(0, 'Running...');

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

        try {
            const response = await fetch(`${apiUrl}/api/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: currentLang, sourceCode }),
            });

            const data = await response.json();
            let outputText = '';

            if (data.compile && data.compile.code !== 0) {
                outputText += `=== Compilation Error ===\n${data.compile.output}\n\n`;
            }

            if (data.run) {
                outputText += data.run.output;
            }

            const finalOutput = outputText || data.message || 'No output';

            // Sync result
            yOutput.delete(0, yOutput.length);
            yOutput.insert(0, finalOutput);

        } catch (err) {
            yOutput.delete(0, yOutput.length);
            yOutput.insert(0, 'Failed to run code');
        } finally {
            setIsRunning(false);
        }
    };

    // Update ref so shortcut calls latest version
    useEffect(() => {
        runCodeRef.current = runCode;
    }, [runCode]);

    return (
        <div className="editor-container">
            <div className="editor-toolbar">
                <div className="toolbar-left">
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="language-select"
                    >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="html">HTML</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                    </select>
                    <button
                        onClick={runCode}
                        disabled={isRunning}
                        title="Ctrl+Enter to run"
                        className="run-btn"
                    >
                        {isRunning ? (
                            <>
                                <span className="spinner">⌛</span> Running...
                            </>
                        ) : (
                            <>
                                <span>▶</span> Run Code
                            </>
                        )}
                    </button>
                </div>

                <div className="active-users">
                    <span style={{ color: '#888', marginRight: '10px', fontSize: '0.8rem' }}>Active:</span>
                    {activeUsers.map((u, i) => (
                        <div key={i} title={u.name} className="active-user-avatar" style={{
                            borderColor: u.color,
                            boxShadow: `0 0 10px ${u.color}40`
                        }}>
                            {u.avatar ? (
                                <img src={u.avatar} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            ) : (
                                u.name.charAt(0).toUpperCase()
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="code-editor-wrapper">
                <Editor
                    height="100%"
                    loading="Loading Editor..."
                    language={language}
                    defaultValue="// Loading..."
                    theme="vs-dark"
                    onMount={handleEditorDidMount}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontLigatures: true,
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                        padding: { top: 16, bottom: 16 },
                    }}
                />
            </div>

            {/* Output Panel */}
            <div className="output-panel">
                <div className="output-header">Terminal Output</div>
                <div className="output-content" style={{ padding: language === 'html' ? 0 : '1rem', background: language === 'html' ? '#fff' : 'transparent' }}>
                    {language === 'html' ? (
                        <iframe
                            srcDoc={output}
                            title="preview"
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            sandbox="allow-scripts"
                        />
                    ) : (
                        output || <span style={{ color: '#444' }}>// Output will appear here...</span>
                    )}
                </div>
            </div>
        </div>
    );
};
