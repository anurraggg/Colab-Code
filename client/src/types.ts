export interface FileNode {
    id: string;
    name: string;
    type: 'file' | 'folder';
    children?: string[];
    parentId?: string | null;
    language?: string;
}

export interface FileTree {
    [id: string]: FileNode;
}

export interface User {
    id: string;
    name: string;
    avatar: string;
    color?: string;
}
