import React, { useState, useEffect, useRef } from 'react';
import type { Project, ProjectAttachment } from '../../types/manager';
import { ProjectStatus } from '../../types/manager';
import Modal from '../Modal';
import { TrashIcon, XMarkIcon, PlusIcon, FileIcon, LinkIcon, ClockIcon, ArrowUpTrayIcon, SpinnerIcon } from '../icons/Icons';
import * as directusService from '../../services/directus';
import { DIRECTUS_URL, DIRECTUS_TOKEN } from '../../config';

interface ProjectDetailModalProps {
    project: Project;
    onClose: () => void;
    onSave: (updatedProject: Project) => void;
    onDelete: (projectId: string) => void;
}

const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ project, onClose, onSave, onDelete }) => {
    const [editableProject, setEditableProject] = useState<Project>(project);
    const [newTag, setNewTag] = useState('');
    const [isAddingLink, setIsAddingLink] = useState(false);
    const [newLink, setNewLink] = useState({ url: '', title: '' });
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setEditableProject(project);
    }, [project]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
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
        setEditableProject(prev => ({
            ...prev,
            attachments: prev.attachments.filter(att => att.id !== junctionIdToRemove),
        }));
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
                    directus_files_id: uploadedFile
                };
                setEditableProject(prev => ({ ...prev, attachments: [...prev.attachments, newAttachment] }));
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
            attachments: [...prev.attachments, newAttachment],
        }));

        setNewLink({ url: '', title: '' });
        setIsAddingLink(false);
    };

    const handleSaveChanges = () => {
        // Filter out any invalid attachments to prevent creating "empty" relations.
        const validAttachmentsToSave = editableProject.attachments.filter(
            att => att.directus_files_id || (att.url && att.url.trim() !== '')
        );

        const projectToSave = {
            ...editableProject,
            // The payload for an M2M relation is an array of objects.
            // Each object represents a row in the junction table.
            attachments: validAttachmentsToSave.map(att => ({
                // If ID is negative (new), don't send it. Otherwise, send it for update.
                id: att.id > 0 ? att.id : undefined,
                url: att.url || null,
                title: att.title || null,
                // Send file ID as a string, not an object, if it exists.
                directus_files_id: att.directus_files_id ? att.directus_files_id.id : null,
            }))
        };
        onSave(projectToSave as any);
    };
    
    const handleDeleteProject = () => {
      if (window.confirm(`Вы уверены, что хотите удалить проект "${project.name}"?`)) {
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
                Удалить проект
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
    const validAttachments = editableProject.attachments.filter(att => att.directus_files_id || att.url);

    return (
        <Modal title="Детали проекта" onClose={onClose} footer={footer}>
            <div className="space-y-6">
                {/* Main details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="name" className="block mb-2 text-sm font-medium text-white">Название проекта</label>
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
                        <select id="status" name="status" value={editableProject.status} onChange={handleInputChange} className={inputClasses}>
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
                
                {/* Attachments */}
                 <div>
                    <h4 className="text-md font-semibold text-slate-200 mb-2">Вложения</h4>
                    {validAttachments.length > 0 && (
                        <ul className="border border-slate-700 rounded-lg divide-y divide-slate-700 mb-4">
                           {validAttachments.map(att => {
                                const isLink = !!att.url;
                                const isFile = !!att.directus_files_id;
                                
                                const fileUrl = isFile ? `${DIRECTUS_URL}/assets/${att.directus_files_id.id}?access_token=${DIRECTUS_TOKEN}` : '#';
                                const finalUrl = att.url || fileUrl;
                                
                                const title = att.title || (isFile ? att.directus_files_id.title : '') || 'Без названия';
                                
                                const subtitle = isFile
                                    ? `${att.directus_files_id.type}, ${(att.directus_files_id.filesize / 1024).toFixed(2)} KB`
                                    : att.url;

                                return (
                                    <li key={att.id} className="p-3 flex items-center justify-between hover:bg-slate-700/50">
                                        <a 
                                            href={finalUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center min-w-0 flex-grow group"
                                            title={title}
                                        >
                                            {isLink ? <LinkIcon className="w-5 h-5 mr-3 text-slate-400 flex-shrink-0" /> : <FileIcon className="w-5 h-5 mr-3 text-slate-400 flex-shrink-0" />}
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">{title}</p>
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