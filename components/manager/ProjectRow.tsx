
import React, { useState } from 'react';
import type { Project } from '../../types/manager';
import { ProjectStatus } from '../../types/manager';
import { StatusBadge } from './StatusBadge';
import { FileIcon, LinkIcon } from '../icons/Icons';
import { isWebViewable, buildDirectusAssetUrl } from '../../utils/fileHelpers';

interface ProjectRowProps {
    project: Project;
    onRowClick: (project: Project) => void;
    isDragged: boolean;
    onDragStart: (id: string) => void;
    onDrop: (targetId: string) => void;
}

export const ProjectRow: React.FC<ProjectRowProps> = ({ project, onRowClick, isDragged, onDragStart, onDrop }) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const isCompleted = project.status === ProjectStatus.Completed;
    const isArchived = project.status === ProjectStatus.Archived;
    const isOverdue = new Date(project.deadline) < new Date() && !isCompleted && !isArchived;

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    };

    const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLTableRowElement>) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLTableRowElement>) => {
        e.preventDefault();
        setIsDragOver(false);
        onDrop(project.id);
    };

    const rowClasses = [
        'transition-colors',
        isDragged ? 'opacity-30' : 'hover:bg-slate-700/50',
        isDragOver ? 'border-t-2 border-blue-500' : '',
    ].join(' ');

    return (
        <tr
            draggable="true"
            onDragStart={() => onDragStart(project.id)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={rowClasses}
        >
            <td 
                className="px-6 py-4 whitespace-nowrap cursor-pointer"
                onClick={() => onRowClick(project)}
            >
                <div className="text-sm font-medium text-white">{project.name}</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 cursor-pointer" onClick={() => onRowClick(project)}>{project.responsible}</td>
            <td className={`px-6 py-4 whitespace-nowrap text-sm cursor-pointer ${isOverdue ? 'text-red-400 font-bold' : 'text-slate-300'}`} onClick={() => onRowClick(project)}>
                {formatDate(project.deadline)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => onRowClick(project)}>
                <StatusBadge status={project.status} />
            </td>
            <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => onRowClick(project)}>
                <div className="flex flex-wrap items-center gap-1.5">
                    {project.tags && project.tags.length > 0 ? (
                        project.tags.map((tag) => (
                            <span key={tag} className="px-2 py-0.5 text-xs rounded bg-slate-700 text-slate-300">
                                {tag}
                            </span>
                        ))
                    ) : (
                        <span className="text-slate-500 text-xs">—</span>
                    )}
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 cursor-pointer" onClick={() => onRowClick(project)}>
                 {!project.attachments || project.attachments.length === 0 ? (
                    <span className="px-2 py-1 text-xs font-medium rounded bg-red-500/20 text-red-400">
                        Нет вложений
                    </span>
                ) : (
                    <div className="flex items-center space-x-2">
                        {(project.attachments || []).map(att => {
                            // Directus возвращает URL (uppercase) и title (lowercase)
                            const linkUrl = att.URL || att.url;
                            const linkTitle = att.title; // title всегда lowercase
                            
                            if (linkUrl) {
                                return (
                                    <a key={att.id} href={linkUrl} target="_blank" rel="noopener noreferrer" title={linkTitle || linkUrl} onClick={(e) => e.stopPropagation()}>
                                        <LinkIcon className="w-5 h-5 text-slate-400 hover:text-blue-400" />
                                    </a>
                                );
                            } else if (att.directus_files_id) {
                                const fileData = typeof att.directus_files_id === 'object' ? att.directus_files_id : null;
                                const fileId = typeof att.directus_files_id === 'string' ? att.directus_files_id : fileData?.id;
                                const fileTitle = fileData?.title || 'Файл';
                                const fileName = fileData?.filename_download || fileTitle;
                                const isViewable = isWebViewable(fileName);
                                const fileUrl = fileId ? buildDirectusAssetUrl(fileId, { forceDownload: !isViewable }) : '#';

                                return (
                                    <a
                                        key={att.id}
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={fileTitle}
                                        onClick={(e) => e.stopPropagation()}
                                        download={!isViewable ? (fileName || undefined) : undefined}
                                    >
                                        <FileIcon className="w-5 h-5 text-slate-400 hover:text-blue-400" />
                                    </a>
                                );
                            }
                            return null;
                        })}
                    </div>
                )}
            </td>
            <td className="px-6 py-4 text-sm text-slate-400 max-w-sm truncate cursor-pointer" onClick={() => onRowClick(project)}>
                {project.notes || '—'}
            </td>
            <td className="px-6 py-4 text-sm text-slate-300 max-w-xs truncate cursor-pointer" onClick={() => onRowClick(project)}>
                {project.director_comment ? project.director_comment : '—'}
            </td>
        </tr>
    );
};
