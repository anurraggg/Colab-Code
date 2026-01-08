import React from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import type { FileNode } from '../types';

interface TabBarProps {
    openFiles: string[];
    activeFileId: string | null;
    files: { [id: string]: FileNode };
    onSelect: (fileId: string) => void;
    onClose: (fileId: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
    openFiles,
    activeFileId,
    files,
    onSelect,
    onClose
}) => {
    return (
        <div className="tab-bar">
            {openFiles.map(fileId => {
                const file = files[fileId];
                if (!file) return null;
                return (
                    <div
                        key={fileId}
                        className={clsx('tab-item', { active: fileId === activeFileId })}
                        onClick={() => onSelect(fileId)}
                    >
                        <span className="tab-name">{file.name}</span>
                        <button
                            className="tab-close"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose(fileId);
                            }}
                        >
                            <X size={12} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};
