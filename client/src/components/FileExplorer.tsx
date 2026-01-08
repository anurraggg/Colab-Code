import React, { useState } from 'react';
import { File, Folder, Trash2, FilePlus } from 'lucide-react';
import type { FileTree } from '../types';
import clsx from 'clsx';

interface FileExplorerProps {
    files: FileTree;
    activeFileId: string | null;
    onFileSelect: (fileId: string) => void;
    onCreateFile: (name: string, type: 'file' | 'folder') => void;
    onDeleteFile: (fileId: string) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
    files,
    activeFileId,
    onFileSelect,
    onCreateFile,
    onDeleteFile
}) => {
    const [isCreating, setIsCreating] = useState<'file' | 'folder' | null>(null);
    const [newName, setNewName] = useState('');

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (newName.trim()) {
            onCreateFile(newName, isCreating!);
            setNewName('');
            setIsCreating(null);
        }
    };

    // Sort: Folders first, then files
    const sortedFiles = Object.values(files).sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'folder' ? -1 : 1;
    });

    return (
        <div className="file-explorer">
            <div className="explorer-header">
                <span className="explorer-title">EXPLORER</span>
                <div className="explorer-actions">
                    <button onClick={() => setIsCreating('file')} title="New File">
                        <FilePlus size={16} />
                    </button>
                    {/* Folder creation disabled for Phase 1 */}
                    {/* <button onClick={() => setIsCreating('folder')} title="New Folder">
                        <FolderPlus size={16} />
                    </button> */}
                </div>
            </div>

            <div className="file-list">
                {sortedFiles.map(file => (
                    <div
                        key={file.id}
                        className={clsx('file-item', { active: file.id === activeFileId })}
                        onClick={() => onFileSelect(file.id)}
                    >
                        {file.type === 'folder' ? (
                            <Folder size={16} className="icon folder" />
                        ) : (
                            <File size={16} className="icon file" />
                        )}
                        <span className="file-name">{file.name}</span>
                        <button
                            className="delete-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteFile(file.id);
                            }}
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}

                {isCreating && (
                    <form onSubmit={handleCreate} className="create-form">
                        {isCreating === 'folder' ? <Folder size={16} /> : <File size={16} />}
                        <input
                            autoFocus
                            type="text"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            onBlur={() => setIsCreating(null)}
                            placeholder="Name..."
                        />
                    </form>
                )}
            </div>
        </div>
    );
};
