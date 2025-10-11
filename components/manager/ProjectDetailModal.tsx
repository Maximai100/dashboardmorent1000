import React, { useState, useEffect, useRef } from 'react';
import type { Project, ProjectAttachment } from '../../types/manager';
import { ProjectStatus } from '../../types/manager';
import Modal from '../Modal';
import { TrashIcon, XMarkIcon, PlusIcon, FileIcon, LinkIcon, ClockIcon, ArrowUpTrayIcon, SpinnerIcon } from '../icons/Icons';
import * as directusService from '../../services/directus';
import { isWebViewable, buildDirectusAssetUrl } from '../../utils/fileHelpers';

type AttachmentPayload = {
    id?: number;
    url?: string | null;
    title?: string | null;
    directus_files_id?: string | null;
    projects_id?: string | number | null;
    _delete?: boolean; // Флаг для удаления attachment в Directus
};

export type ProjectUpdatePayload = {
    id: string;
    name: string;
    responsible: string;
    deadline: string;
    notes: string;
    director_comment: string;
    attachments: AttachmentPayload[];
    tags?: string[];
    status?: string | null;
};

interface ProjectDetailModalProps {
    project: Project;
    onClose: () => void;
    onSave: (updatedProject: ProjectUpdatePayload) => void;
    onDelete: (projectId: string) => void;
}

const parseStatus = (status: Project['status']): ProjectStatus | null => {
    if (status === null || status === undefined) {
        return null;
    }

    if (typeof status === 'string') {
        try {
            const parsed = JSON.parse(status);
            if (typeof parsed === 'string') {
                return parsed as ProjectStatus;
            }
        } catch {
            if (Object.values(ProjectStatus).includes(status as ProjectStatus)) {
                return status as ProjectStatus;
            }
        }
        return null;
    }

    return status;
};

const normalizeAttachments = (
    attachments: ProjectAttachment[] | (number | string)[] | undefined | null,
    projectId: string
): ProjectAttachment[] => {
    if (!attachments) return [];

    const projectIdNumber = Number(projectId);
    const fallbackProjectId = Number.isNaN(projectIdNumber) ? projectId : projectIdNumber;

    return attachments.map((att) => {
        if (typeof att === 'number' || typeof att === 'string') {
            const numericId = Number(att);
            return {
                id: Number.isNaN(numericId) ? -1 : numericId,
                projects_id: fallbackProjectId,
                url: undefined,
            } as ProjectAttachment;
        }

        const url = att.url ?? (typeof att.URL === 'string' ? att.URL : undefined);
        return {
            ...att,
            projects_id: att.projects_id ?? fallbackProjectId,
            url,
        };
    });
};

const normalizeProject = (incoming: Project): Project => ({
    ...incoming,
    tags: incoming.tags ?? [],
    attachments: normalizeAttachments(incoming.attachments, incoming.id),
    history: incoming.history ?? [],
    notes: incoming.notes ?? '',
    director_comment: incoming.director_comment ?? '',
    status: parseStatus(incoming.status ?? null),
});

const tagsEqual = (a: string[] = [], b: string[] = []) => {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((value, index) => value === sortedB[index]);
};

const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ project, onClose, onSave, onDelete }) => {
    const [editableProject, setEditableProject] = useState<Project>(() => normalizeProject(project));
    const [newTag, setNewTag] = useState('');
    const [isAddingLink, setIsAddingLink] = useState(false);
    const [newLink, setNewLink] = useState({ url: '', title: '' });
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setEditableProject(normalizeProject(project));
    }, [project]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'status') {
            setEditableProject(prev => ({
                ...prev,
                status: value ? (value as ProjectStatus) : null,
            }));
            return;
        }

        setEditableProject(prev => ({ ...prev, [name]: value }));
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const date = e.target.value; // YYYY-MM-DD
        if (date) {
            const currentDeadline = new Date(editableProject.deadline);
            currentDeadline.setFullYear(parseInt(date.substring(0, 4), 10));
            currentDeadline.setMonth(parseInt(date.substring(5, 7), 10) - 1);
            currentDeadline.setDate(parseInt(date.substring(8, 10), 10));
            setEditableProject(prev => ({ ...prev, deadline: currentDeadline.toISOString() }));
        }
    };
    
    const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && newTag.trim() !== '') {
            e.preventDefault();
            if (!editableProject.tags.includes(newTag.trim())) {
                setEditableProject(prev => ({
                    ...prev,
                    tags: [...prev.tags, newTag.trim()],
                }));
            }
            setNewTag('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setEditableProject(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove),
        }));
    };

    const handleRemoveAttachment = (junctionIdToRemove: number) => {
        console.log(`🗑️ Удаление attachment из локального состояния:`, { id: junctionIdToRemove });
        setEditableProject(prev => {
            const newAttachments = (prev.attachments || []).filter(att => att.id !== junctionIdToRemove);
            console.log(`   Было: ${prev.attachments?.length || 0}, стало: ${newAttachments.length}`);
            return {
                ...prev,
                attachments: newAttachments,
            };
        });
    };
    
    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                setIsUploading(true);
                const uploadedFile = await directusService.uploadFile(file);
                const newAttachment: ProjectAttachment = {
                    id: Date.now() * -1, // Negative temporary ID
                    projects_id: project.id,
                    directus_files_id: uploadedFile, // Сохраняем полный объект файла
                    title: uploadedFile.title || file.name
                };
                setEditableProject(prev => ({ ...prev, attachments: [...(prev.attachments || []), newAttachment] }));
            } catch (error) {
                console.error("File upload failed:", error);
                alert("Не удалось загрузить файл.");
            } finally {
                setIsUploading(false);
            }
        }
        if (event.target) {
            event.target.value = '';
        }
    };
    
    const handleAddLink = () => {
        if (!newLink.url.trim()) return;

        const newAttachment: ProjectAttachment = {
            id: Date.now() * -1, // Negative ID for local state tracking
            projects_id: project.id,
            url: newLink.url.trim(),
            title: newLink.title.trim() || newLink.url.trim(),
        };

        setEditableProject(prev => ({
            ...prev,
            attachments: [...(prev.attachments || []), newAttachment],
        }));

        setNewLink({ url: '', title: '' });
        setIsAddingLink(false);
    };

    const handleSaveChanges = () => {
        const pendingTag = newTag.trim();
        const currentTags = editableProject.tags ?? [];
        const tagsIncludingPending = pendingTag && !currentTags.includes(pendingTag)
            ? [...currentTags, pendingTag]
            : currentTags;

        if (pendingTag && !currentTags.includes(pendingTag)) {
            setEditableProject(prev => ({
                ...prev,
                tags: tagsIncludingPending,
            }));
            setNewTag('');
        }

        // Разделяем attachments на существующие, новые и удаленные
        const originalAttachmentIds = new Set((project.attachments || []).map(att => att.id));
        const currentAttachmentIds = new Set((editableProject.attachments || []).map(att => att.id));
        
        console.log('🔍 Анализ attachments:', {
            original: Array.from(originalAttachmentIds),
            current: Array.from(currentAttachmentIds),
            deleted: Array.from(originalAttachmentIds).filter(id => !currentAttachmentIds.has(id))
        });
        
        const attachmentsPayload: any[] = [];
        
        // Отправляем только текущие attachments (существующие + новые)
        // Directus автоматически удалит те, которых нет в списке
        
        // 1. Сохраняем существующие attachments (с положительным ID)
        (editableProject.attachments || []).forEach(att => {
            if (att.id > 0) {
                // Существующий attachment - отправляем только ID для сохранения
                attachmentsPayload.push({ id: att.id });
                console.log(`📎 Сохраняем существующий attachment:`, { id: att.id });
            }
        });
        
        // 2. Добавляем новые attachments (с отрицательным ID)
        (editableProject.attachments || []).forEach(att => {
            if (att.id < 0) {
                // Пропускаем невалидные attachments
                if (!att.directus_files_id && (!att.url || att.url.trim() === '')) {
                    return;
                }

                const payload: any = {
                    projects_id: project.id
                };

                // Для ссылок - Directus ожидает URL (uppercase) и title (lowercase)
                if (att.url && att.url.trim() !== '') {
                    payload.URL = att.url.trim();  // Directus использует URL (uppercase)
                    if (att.title && att.title.trim() !== '') {
                        payload.title = att.title.trim();  // Directus использует title (lowercase)
                    }
                    console.log(`🔗 Сохранение ссылки:`, { URL: payload.URL, title: payload.title });
                }

                // Для файлов
                if (att.directus_files_id) {
                    const fileId = typeof att.directus_files_id === 'string' 
                        ? att.directus_files_id 
                        : att.directus_files_id.id;
                    payload.directus_files_id = fileId;
                    
                    if (att.title) {
                        payload.title = att.title;
                    }
                }

                console.log(`📎 Добавляем новый attachment:`, payload);
                attachmentsPayload.push(payload);
            }
        });
        
        // Directus автоматически удалит attachments, которых нет в списке
        const deletedIds = Array.from(originalAttachmentIds).filter(id => !currentAttachmentIds.has(id) && id > 0);
        if (deletedIds.length > 0) {
            console.log(`📎 Будут удалены attachments (не включены в список):`, deletedIds);
        }

        const originalTags = project.tags ?? [];
        const newTags = tagsIncludingPending;
        const tagsChanged = !tagsEqual(originalTags, newTags);

        const originalStatus = project.status ?? null;
        const newStatus = editableProject.status ?? null;
        const statusChanged = originalStatus !== newStatus;

        const projectToSave: ProjectUpdatePayload = {
            id: project.id,
            name: editableProject.name,
            responsible: editableProject.responsible,
            deadline: editableProject.deadline,
            notes: editableProject.notes ?? '',
            director_comment: editableProject.director_comment ?? '',
            attachments: attachmentsPayload,
        };

        if (tagsChanged) {
            projectToSave.tags = newTags;
        }

        if (statusChanged) {
            projectToSave.status = newStatus ? JSON.stringify(newStatus) : null;
        }

        console.log('💾 Сохранение задачи:', {
            projectId: project.id,
            attachmentsCount: attachmentsPayload.length,
            attachments: attachmentsPayload
        });

        onSave(projectToSave);
    };
    
    const handleDeleteProject = () => {
      if (window.confirm(`Вы уверены, что хотите удалить задачу "${project.name}"?`)) {
        onDelete(project.id);
      }
    }
    
    const inputClasses = "bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5";

    const footer = (
         <div className="flex justify-between w-full">
            <button
                type="button"
                onClick={handleDeleteProject}
                className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-colors"
            >
                <TrashIcon className="w-4 h-4" />
                Удалить задачу
            </button>
            <div className="flex space-x-2">
                <button type="button" onClick={onClose} className="text-white bg-slate-600 hover:bg-slate-700 border border-slate-500 focus:outline-none focus:ring-4 focus:ring-slate-500 font-medium rounded-lg text-sm px-5 py-2.5">
                    Отмена
                </button>
                <button type="button" onClick={handleSaveChanges} className="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5">
                    Сохранить изменения
                </button>
            </div>
        </div>
    );

    // Filter out any invalid attachments that are neither a file nor a link for display
    const validAttachments = (editableProject.attachments || []).filter(att => att.directus_files_id || att.url || att.URL);
    
    console.log(`🖼️ Отображение attachments для задачи "${project.name}":`, {
        total: editableProject.attachments?.length || 0,
        valid: validAttachments.length,
        attachments: validAttachments.map(att => ({
            id: att.id,
            hasFile: !!att.directus_files_id,
            fileType: typeof att.directus_files_id,
            hasUrl: !!att.url,
            title: att.title
        }))
    });

    return (
        <Modal title="Детали задачи" onClose={onClose} footer={footer}>
            <div className="space-y-6">
                {/* Main details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="name" className="block mb-2 text-sm font-medium text-white">Название задачи</label>
                        <input type="text" id="name" name="name" value={editableProject.name} onChange={handleInputChange} className={inputClasses} />
                    </div>
                     <div>
                        <label htmlFor="responsible" className="block mb-2 text-sm font-medium text-white">Ответственный</label>
                        <input type="text" id="responsible" name="responsible" value={editableProject.responsible} onChange={handleInputChange} className={inputClasses} />
                    </div>
                     <div>
                        <label htmlFor="deadline" className="block mb-2 text-sm font-medium text-white">Дедлайн</label>
                        <input type="date" id="deadline" name="deadline" value={editableProject.deadline.split('T')[0]} onChange={handleDateChange} className={inputClasses} />
                    </div>
                     <div>
                        <label htmlFor="status" className="block mb-2 text-sm font-medium text-white">Статус</label>
                        <select id="status" name="status" value={editableProject.status ?? ''} onChange={handleInputChange} className={inputClasses}>
                            <option value="">Без статуса</option>
                            {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                {/* Tags */}
                <div>
                    <label htmlFor="tags" className="block mb-2 text-sm font-medium text-white">Теги</label>
                    <div className="flex flex-wrap gap-2 items-center p-2 border border-slate-600 rounded-lg bg-slate-700">
                        {editableProject.tags.map(tag => (
                            <span key={tag} className="flex items-center bg-blue-900 text-blue-300 text-xs font-medium px-2 py-1 rounded-full">
                                {tag}
                                <button onClick={() => handleRemoveTag(tag)} className="ml-1.5 -mr-0.5 p-0.5 rounded-full hover:bg-blue-700">
                                    <XMarkIcon className="w-3 h-3"/>
                                </button>
                            </span>
                        ))}
                        <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={handleAddTag}
                            placeholder="Добавить тег..."
                            className="bg-transparent focus:outline-none flex-grow text-sm min-w-[100px] text-white"
                        />
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <label htmlFor="notes" className="block mb-2 text-sm font-medium text-white">Заметки</label>
                    <textarea id="notes" name="notes" rows={4} value={editableProject.notes} onChange={handleInputChange} className={inputClasses}></textarea>
                </div>

                {/* Director Comment */}
                <div>
                    <label htmlFor="director_comment" className="block mb-2 text-sm font-medium text-white">Комментарий руководителя</label>
                    <textarea
                        id="director_comment"
                        name="director_comment"
                        rows={3}
                        value={editableProject.director_comment}
                        onChange={handleInputChange}
                        className={inputClasses}
                        placeholder="Добавьте комментарий для команды..."
                    ></textarea>
                </div>
                
                {/* Attachments */}
                 <div>
                    <h4 className="text-md font-semibold text-slate-200 mb-2">Вложения</h4>
                    {validAttachments.length > 0 && (
                        <ul className="border border-slate-700 rounded-lg divide-y divide-slate-700 mb-4">
                           {validAttachments.map(att => {
                                // Directus возвращает URL (uppercase) и title (lowercase)
                                const linkUrl = att.URL || att.url;
                                const isLink = !!linkUrl;
                                const isFile = !!att.directus_files_id;
                                
                                // directus_files_id может быть строкой (ID) или объектом
                                const fileId = typeof att.directus_files_id === 'string' 
                                    ? att.directus_files_id 
                                    : att.directus_files_id?.id;
                                
                                const fileObj = typeof att.directus_files_id === 'object' ? att.directus_files_id : null;
                                // Для всех используем title (lowercase) - это стандартное поле Directus
                                const displayTitle = att.title || (fileObj?.title) || 'Файл';
                                const fileName = fileObj?.filename_download || fileObj?.title || displayTitle;
                                const isViewableFile = isFile ? isWebViewable(fileName) : false;
                                const fileUrl = isFile && fileId ? buildDirectusAssetUrl(fileId, { forceDownload: !isViewableFile }) : '#';
                                const finalUrl = linkUrl || fileUrl;
                                
                                const subtitle = isFile && fileObj
                                    ? `${fileObj.type || 'файл'}, ${((fileObj.filesize || 0) / 1024).toFixed(2)} KB`
                                    : linkUrl;

                                return (
                                    <li key={att.id} className="p-3 flex items-center justify-between hover:bg-slate-700/50">
                                        <a 
                                            href={finalUrl}
                                            target={!linkUrl && isFile && !isViewableFile ? undefined : '_blank'}
                                            rel={!linkUrl && isFile && !isViewableFile ? undefined : 'noopener noreferrer'}
                                            className="flex items-center min-w-0 flex-grow group"
                                            title={displayTitle}
                                            download={!linkUrl && isFile && !isViewableFile ? (fileName || undefined) : undefined}
                                        >
                                            {isLink ? <LinkIcon className="w-5 h-5 mr-3 text-slate-400 flex-shrink-0" /> : <FileIcon className="w-5 h-5 mr-3 text-slate-400 flex-shrink-0" />}
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">{displayTitle}</p>
                                                <p className="text-xs text-slate-400 truncate">{subtitle}</p>
                                            </div>
                                        </a>
                                        <button onClick={() => handleRemoveAttachment(att.id)} className="ml-4 p-1.5 rounded-full hover:bg-red-900/50 text-slate-400 hover:text-red-400 flex-shrink-0" title="Удалить вложение">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </li>
                               );
                           })}
                        </ul>
                    )}
                    <div className="space-y-3 p-3 bg-slate-700/50 rounded-lg">
                        <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-600 border border-slate-500 rounded-lg shadow-sm hover:bg-slate-500 disabled:bg-slate-500 disabled:cursor-wait"
                        >
                            {isUploading ? 
                                <>
                                    <SpinnerIcon className="w-5 h-5 animate-spin" />
                                    <span>Загрузка...</span>
                                </>
                                :
                                <>
                                    <ArrowUpTrayIcon className="w-5 h-5" />
                                    <span>Загрузить файл</span>
                                </>
                             }
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                         <button
                            type="button"
                            onClick={() => setIsAddingLink(!isAddingLink)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-600 border border-slate-500 rounded-lg shadow-sm hover:bg-slate-500"
                        >
                            <LinkIcon className="w-5 h-5" />
                            <span>{isAddingLink ? 'Отменить' : 'Добавить ссылку'}</span>
                        </button>
                        {isAddingLink && (
                            <div className="pt-3 border-t border-slate-600 space-y-3">
                                <input
                                    type="url"
                                    placeholder="https://example.com/document"
                                    value={newLink.url}
                                    onChange={(e) => setNewLink(prev => ({ ...prev, url: e.target.value }))}
                                    className={inputClasses}
                                />
                                <input
                                    type="text"
                                    placeholder="Название (необязательно)"
                                    value={newLink.title}
                                    onChange={(e) => setNewLink(prev => ({ ...prev, title: e.target.value }))}
                                    className={inputClasses}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddLink}
                                    disabled={!newLink.url.trim()}
                                    className="w-full text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 disabled:bg-blue-500 disabled:cursor-not-allowed"
                                >
                                    Сохранить ссылку
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* History */}
                <div>
                    <h4 className="text-md font-semibold text-slate-200 mb-2">История изменений</h4>
                    <ul className="space-y-2 text-sm">
                        {editableProject.history.map(log => (
                            <li key={log.id} className="flex items-center text-slate-400">
                                <ClockIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                                {new Date(log.timestamp).toLocaleString('ru-RU')} - <span className="font-medium text-slate-300 mx-1">{log.user}</span> - {log.action}
                            </li>
                        ))}
                    </ul>
                </div>

            </div>
        </Modal>
    );
};

export default ProjectDetailModal;
