import { useState, useEffect, useCallback } from 'react';
import type { Project } from '../types/manager';
import { ProjectStatus } from '../types/manager';
import * as directusService from '../services/directus';

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
    attachments: Project['attachments'] | (number | string)[] | undefined | null,
    projectId: string
): Project['attachments'] => {
    if (!attachments) return [];

    return attachments.map((att) => {
        if (typeof att === 'number' || typeof att === 'string') {
            const numericId = Number(att);
            return {
                id: Number.isNaN(numericId) ? -1 : numericId,
                projects_id: projectId,
                url: undefined,
            } as unknown as Project['attachments'][number];
        }

        const url = att.url ?? (typeof (att as any).URL === 'string' ? (att as any).URL : undefined);
        const projects_id =
            att.projects_id ??
            (() => {
                const parsed = Number(projectId);
                return Number.isNaN(parsed) ? projectId : parsed;
            })();

        return {
            ...att,
            projects_id,
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

export const useProjectData = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectOrder, setProjectOrder] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const fetchedProjects = await directusService.getProjects();
            const normalizedProjects = fetchedProjects.map(normalizeProject);
            setProjects(normalizedProjects);

            const savedOrder = localStorage.getItem('projectOrder');
            if (savedOrder) {
                // Filter saved order to only include IDs of projects that still exist
                const existingProjectIds = new Set(fetchedProjects.map(p => p.id));
                const validOrder = JSON.parse(savedOrder).filter((id: string) => existingProjectIds.has(id));
                setProjectOrder(validOrder);
            } else {
                setProjectOrder(fetchedProjects.map(p => p.id));
            }

            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch projects');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        // Save order to localStorage whenever it changes, but only if it's not the initial empty array
        if (projectOrder.length > 0) {
            localStorage.setItem('projectOrder', JSON.stringify(projectOrder));
        }
    }, [projectOrder]);

    const addProject = async (newProject: Omit<Project, 'id'>): Promise<Project | undefined> => {
        try {
            const createdProject = await directusService.createProject(newProject);
            const normalizedProject = normalizeProject(createdProject);
            // Atomically update both projects list and their order
            setProjects(prev => [normalizedProject, ...prev]);
            setProjectOrder(prev => [normalizedProject.id, ...prev]);
            return normalizedProject;
        } catch (err: any) {
            setError(err.message || 'Failed to create project');
            return undefined;
        }
    };

    const updateProject = async (id: string, updatedProjectData: Partial<Project>) => {
        try {
            console.log('📤 Отправка обновления проекта:', { id, attachments: updatedProjectData.attachments });
            
            const updatedProject = await directusService.updateProject(id, updatedProjectData);
            
            console.log('📥 Получен ответ от Directus:', { 
                attachmentsCount: updatedProject.attachments?.length,
                attachments: updatedProject.attachments 
            });
            
            // Ensure attachments include nested file data; fallback to fetch attachments
            const attachmentsNeedRefresh =
                !updatedProject.attachments ||
                updatedProject.attachments.some((a: any) => {
                    if (!a) return true;
                    if (typeof a === 'number' || typeof a === 'string') return true;
                    if (a.directus_files_id && typeof a.directus_files_id === 'string') return true;
                    return false;
                });

            if (attachmentsNeedRefresh) {
                console.log('🔄 Загрузка полных данных attachments...');
                const freshAttachments = await directusService.getProjectAttachments(id);
                console.log('✅ Загружено attachments:', freshAttachments.length);
                updatedProject.attachments = freshAttachments as any;
            }

            const normalized = normalizeProject(updatedProject);
            console.log('✅ Проект обновлен:', { 
                id: normalized.id, 
                attachmentsCount: normalized.attachments.length 
            });
            
            setProjects(prev => prev.map(p => (p.id === id ? normalized : p)));
        } catch (err: any) {
            console.error('❌ Failed to update project', err);
            setError(err.message || 'Failed to update project');
        }
    };
    
    const deleteProject = async (id: string) => {
         try {
            await directusService.deleteProject(id);
            // Atomically update both projects list and their order
            setProjects(prev => prev.filter(p => p.id !== id));
            setProjectOrder(prev => prev.filter(projId => projId !== id));
        } catch (err: any) {
            setError(err.message || 'Failed to delete project');
        }
    };

    const loadProjectAttachments = async (projectId: string) => {
        try {
            const attachments = await directusService.getProjectAttachments(projectId);
            const normalizedAttachments = normalizeAttachments(attachments as any, projectId);
            setProjects(prev =>
                prev.map(p => (p.id === projectId ? { ...p, attachments: normalizedAttachments } : p))
            );
            return normalizedAttachments;
        } catch (err: any) {
            console.warn(`Failed to load attachments for project ${projectId}:`, err);
            return [];
        }
    };

    return { 
        projects, 
        projectOrder, 
        setProjectOrder, // Expose setter for drag-and-drop
        loading, 
        error, 
        addProject, 
        updateProject, 
        deleteProject,
        loadProjectAttachments // Load attachments on-demand
    };
};
