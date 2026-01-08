import React, { useRef, useEffect, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { FileExplorer } from './FileExplorer';
import { TabBar } from './TabBar';
import type { FileNode, FileTree, User } from '../types';
import { v4 as uuidv4 } from 'uuid';

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

    // File System State
    const [files, setFiles] = useState<FileTree>({});
    const [activeFileId, setActiveFileId] = useState<string | null>(null);
    const [openFiles, setOpenFiles] = useState<string[]>([]);

    const [language, setLanguage] = useState('javascript');
    const [yOutput, setYOutput] = useState<Y.Text | null>(null);
    const [activeUsers, setActiveUsers] = useState<any[]>([]);
    const [output, setOutput] = useState<string>('');
    const [isRunning, setIsRunning] = useState(false);

    // Refs
    const languageRef = useRef(language);
    const runCodeRef = useRef<() => void>(() => { });
    const activeFileIdRef = useRef(activeFileId);

    useEffect(() => {
        languageRef.current = language;
    }, [language]);

    useEffect(() => {
        activeFileIdRef.current = activeFileId;
    }, [activeFileId]);

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

        const fileTreeMap = ydoc.getMap<FileNode>('fileTree');
        const outputText = ydoc.getText('output');
        setYOutput(outputText);

        // Sync File Tree
        const updateFiles = () => {
            setFiles(fileTreeMap.toJSON() as FileTree);
        };
        fileTreeMap.observe(updateFiles);

        // Initial Sync
        wsProvider.on('sync', (isSynced: boolean) => {
            if (isSynced) {
                if (fileTreeMap.size === 0) {
                    // Initialize default file if empty
                    const mainId = uuidv4();
                    const mainFile: FileNode = { id: mainId, name: 'main.js', type: 'file', language: 'javascript' };
                    fileTreeMap.set(mainId, mainFile);
                    ydoc.getText(mainId).insert(0, '// Welcome to Colab Code!\nconsole.log("Hello World");');
                }
                updateFiles();
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

    // Handle File Switching
    useEffect(() => {
        if (!doc || !provider || !editorRef.current || !activeFileId) return;

        // Destroy old binding
        if (binding) {
            binding.destroy();
        }

        const file = files[activeFileId];
        if (!file) return;

        // Update Language
        const lang = file.language || 'javascript';
        setLanguage(lang);

        // Create new binding
        const yText = doc.getText(activeFileId);
        const monacoBinding = new MonacoBinding(
            yText,
            editorRef.current.getModel()!,
            new Set([editorRef.current]),
            provider.awareness
        );
        setBinding(monacoBinding);

    }, [activeFileId, doc, provider, files]); // Re-run when active file changes

    // Set initial active file
    useEffect(() => {
        if (!activeFileId && Object.keys(files).length > 0) {
            const firstFileId = Object.keys(files)[0];
            setActiveFileId(firstFileId);
            setOpenFiles([firstFileId]);
        }
    }, [files]);

    const handleFileSelect = (fileId: string) => {
        setActiveFileId(fileId);
        if (!openFiles.includes(fileId)) {
            setOpenFiles([...openFiles, fileId]);
        }
    };

    const handleCreateFile = (name: string, type: 'file' | 'folder') => {
        if (!doc) return;
        const id = uuidv4();
        const fileTreeMap = doc.getMap<FileNode>('fileTree');

        // Simple language detection
        let lang = 'javascript';
        if (name.endsWith('.html')) lang = 'html';
        else if (name.endsWith('.css')) lang = 'css';
        else if (name.endsWith('.py')) lang = 'python';
        else if (name.endsWith('.json')) lang = 'json';
        else if (name.endsWith('.ts')) lang = 'typescript';
        else if (name.endsWith('.java')) lang = 'java';

        const newNode: FileNode = { id, name, type, language: lang };
        fileTreeMap.set(id, newNode);

        if (type === 'file') {
            doc.getText(id).insert(0, ''); // Init empty content
            handleFileSelect(id);
        }
    };

    const handleDeleteFile = (fileId: string) => {
        if (!doc) return;
        const fileTreeMap = doc.getMap<FileNode>('fileTree');
        fileTreeMap.delete(fileId);

        // Close tab if open
        if (openFiles.includes(fileId)) {
            const newOpen = openFiles.filter(id => id !== fileId);
            setOpenFiles(newOpen);
            if (activeFileId === fileId) {
                setActiveFileId(newOpen.length > 0 ? newOpen[0] : null);
            }
        }
    };

    const handleCloseTab = (fileId: string) => {
        const newOpen = openFiles.filter(id => id !== fileId);
        setOpenFiles(newOpen);
        if (activeFileId === fileId) {
            setActiveFileId(newOpen.length > 0 ? newOpen[0] : null);
        }
    };

    const runCode = async () => {
        if (!editorRef.current || !yOutput || !activeFileId) return;
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
        <div className="editor-container" style={{ height: 'calc(100vh - 60px)' }}>
            {/* File Explorer Sidebar */}
            <FileExplorer
                files={files}
                activeFileId={activeFileId}
                onFileSelect={handleFileSelect}
                onCreateFile={handleCreateFile}
                onDeleteFile={handleDeleteFile}
            />

            {/* Main Editor Area */}
            <div className="editor-main">
                <TabBar
                    openFiles={openFiles}
                    activeFileId={activeFileId}
                    files={files}
                    onSelect={handleFileSelect}
                    onClose={handleCloseTab}
                />

                <div className="editor-toolbar">
                    <div className="toolbar-left">
                        <span style={{ color: '#888', fontSize: '0.9rem', marginRight: '10px' }}>
                            {language.toUpperCase()}
                        </span>
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

                <div style={{ flex: 1, position: 'relative' }}>
                    <Editor
                        height="100%"
                        language={language}
                        defaultValue="// Select a file to start coding..."
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
        </div>
    );
};
