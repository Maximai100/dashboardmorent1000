import { DIRECTUS_URL, DIRECTUS_TOKEN } from '../config';
import type { Project, ProjectAttachment } from '../types/manager';
import type { Owner } from '../types';
import { ColumnType, AttributeType } from '../types';

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.errors?.[0]?.message || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
    }
    const data = await response.json();
    return data.data;
};

const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
});

const serializeStatus = (status: Project['status'] | string | null | undefined): string | null => {
    if (status === null || status === undefined || status === '') {
        return null;
    }

    if (typeof status === 'string') {
        const trimmed = status.trim();
        if (
            (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
            trimmed.startsWith('{') ||
            trimmed.startsWith('[')
        ) {
            return trimmed;
        }
        return JSON.stringify(status);
    }

    return JSON.stringify(status);
};

// --- Projects API ---

export const getProjects = async (): Promise<Project[]> => {
    // Fetch projects with deep-expanded attachments
    // Явно указываем все поля, включая ссылки и файлы, без прямого запроса к junction table
    const baseFields = [
        'id',
        'name',
        'responsible',
        'deadline',
        'status',
        'notes',
        'tags',
        'director_comment',
        'history',
        'attachments.id',
        'attachments.projects_id',
        'attachments.directus_files_id',
        'attachments.URL',
        'attachments.title'
    ];

    const params = new URLSearchParams();
    params.set('fields', baseFields.join(','));
    params.set('deep[attachments][_fields]', [
        'id',
        'projects_id',
        'directus_files_id.*',
        'URL',
        'title'
    ].join(','));
    
    const response = await fetch(`${DIRECTUS_URL}/items/projects?${params.toString()}`, {
        headers: {
            'Authorization': `Bearer ${DIRECTUS_TOKEN}`
        }
    });
    const projects = await handleResponse(response);
    
    // Для каждого проекта загружаем полные данные файлов и ссылок
    console.log(`📂 Загружено проектов: ${projects.length}`);
    projects.forEach(p => {
        console.log(`  📋 Проект "${p.name}": attachments =`, p.attachments);
    });
    
    for (const project of projects) {
        if (project.attachments && project.attachments.length > 0) {
            console.log(`📎 Проект "${project.name}": ${project.attachments.length} attachments`);
            
            // Загружаем полные данные для каждого attachment
            for (const attachment of project.attachments) {
                // Для файлов - загружаем данные из directus_files
                if (attachment.directus_files_id && typeof attachment.directus_files_id === 'string') {
                    try {
                        console.log(`🔄 Загрузка файла: ${attachment.directus_files_id}`);
                        const fileResponse = await fetch(
                            `${DIRECTUS_URL}/files/${attachment.directus_files_id}?fields=id,title,filesize,type,filename_disk,uploaded_on`,
                            { headers: { 'Authorization': `Bearer ${DIRECTUS_TOKEN}` } }
                        );
                        if (fileResponse.ok) {
                            const fileData = await fileResponse.json();
                            attachment.directus_files_id = fileData.data;
                            console.log(`✅ Файл загружен: ${fileData.data.title || fileData.data.id}`);
                        } else {
                            console.warn(`❌ Ошибка загрузки файла ${attachment.directus_files_id}: ${fileResponse.status}`);
                        }
                    } catch (error) {
                        console.warn(`❌ Failed to fetch file ${attachment.directus_files_id}:`, error);
                    }
                }

                // Normalize link fields coming from Directus
                if (!attachment.directus_files_id) {
                    const linkUrl = (attachment as any).URL ?? attachment.url;
                    if (linkUrl && !attachment.url) {
                        attachment.url = linkUrl;
                    }
                    if (!attachment.URL && linkUrl) {
                        attachment.URL = linkUrl;
                    }
                }
            }
        }
    }
    
    return projects;
};

export const getProjectAttachments = async (projectId: string): Promise<ProjectAttachment[]> => {
    // Read attachments via the project endpoint to respect collection-level permissions
    // Загружаем ссылки и файлы через deep-параметры, избегая прямого запроса к junction table
    const params = new URLSearchParams();
    params.set('fields', [
        'attachments.id',
        'attachments.projects_id',
        'attachments.directus_files_id',
        'attachments.URL',
        'attachments.title'
    ].join(','));
    params.set('deep[attachments][_fields]', [
        'id',
        'projects_id',
        'directus_files_id.*',
        'URL',
        'title'
    ].join(','));

    const response = await fetch(`${DIRECTUS_URL}/items/projects/${projectId}?${params.toString()}`, {
        headers: {
            'Authorization': `Bearer ${DIRECTUS_TOKEN}`
        }
    });
    const project = await handleResponse(response);
    const attachments = Array.isArray(project?.attachments) ? project.attachments : [];
    
    // Загружаем полные данные файлов и ссылок
    for (const attachment of attachments) {
        // Для файлов
        if (attachment.directus_files_id && typeof attachment.directus_files_id === 'string') {
            try {
                const fileResponse = await fetch(
                    `${DIRECTUS_URL}/files/${attachment.directus_files_id}?fields=id,title,filesize,type,filename_disk,uploaded_on`,
                    { headers: { 'Authorization': `Bearer ${DIRECTUS_TOKEN}` } }
                );
                if (fileResponse.ok) {
                    const fileData = await fileResponse.json();
                    attachment.directus_files_id = fileData.data;
                }
            } catch (error) {
                console.warn(`Failed to fetch file ${attachment.directus_files_id}:`, error);
            }
        }
        
        if (!attachment.directus_files_id) {
            const linkUrl = (attachment as any).URL ?? attachment.url;
            if (linkUrl && !attachment.url) {
                attachment.url = linkUrl;
            }
            if (!attachment.URL && linkUrl) {
                attachment.URL = linkUrl;
            }
        }
    }
    
    return attachments;
};

export const createProject = async (projectData: Omit<Project, 'id'>): Promise<Project> => {
    // For new projects, exclude all JSON fields that might cause issues
    const { history, tags, status, ...baseData } = projectData;

    const formattedData = {
        ...baseData,
        // Only include JSON fields if they have actual data
        ...(history && history.length > 0 ? { history } : {}),
        ...(tags && tags.length > 0 ? { tags } : {}),
        ...(() => {
            const serializedStatus = serializeStatus(status ?? null);
            return serializedStatus !== null ? { status: serializedStatus } : {};
        })(),
    };
    
    console.log('Sending project data:', formattedData);
    
    const response = await fetch(`${DIRECTUS_URL}/items/projects`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formattedData),
    });
    return handleResponse(response);
};

export const updateProject = async (id: string, projectData: Partial<Project>): Promise<Project> => {
    const payload: Record<string, unknown> = { ...projectData };

    if ('status' in payload) {
        payload.status = serializeStatus(payload.status as any);
    }

    console.log('🔄 Обновление проекта:', {
        projectId: id,
        attachments: payload.attachments,
        payload
    });

    // Request the updated project back with attachments
    const params = new URLSearchParams();
    params.set('fields', [
        '*',
        'attachments.id',
        'attachments.projects_id',
        'attachments.directus_files_id',
        'attachments.URL',
        'attachments.title'
    ].join(','));
    params.set('deep[attachments][_fields]', [
        'id',
        'projects_id',
        'directus_files_id.*',
        'URL',
        'title'
    ].join(','));

    const response = await fetch(`${DIRECTUS_URL}/items/projects/${id}?${params.toString()}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
    });
    const project = await handleResponse(response);
    
    // Загружаем полные данные файлов для attachments
    if (project.attachments && project.attachments.length > 0) {
        for (const attachment of project.attachments) {
            if (attachment.directus_files_id && typeof attachment.directus_files_id === 'string') {
                try {
                    const fileResponse = await fetch(
                        `${DIRECTUS_URL}/files/${attachment.directus_files_id}?fields=id,title,filesize,type,filename_disk,uploaded_on`,
                        { headers: { 'Authorization': `Bearer ${DIRECTUS_TOKEN}` } }
                    );
                    if (fileResponse.ok) {
                        const fileData = await fileResponse.json();
                        attachment.directus_files_id = fileData.data;
                    }
                } catch (error) {
                    console.warn(`Failed to fetch file ${attachment.directus_files_id}:`, error);
                }
            }
        }
    }
    
    return project;
};

export const deleteProject = async (id: string): Promise<void> => {
    const response = await fetch(`${DIRECTUS_URL}/items/projects/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    if (!response.ok) {
        throw new Error('Failed to delete project');
    }
    // DELETE returns 204 No Content
};

// --- Owners API ---

export const getOwners = async (): Promise<Owner[]> => {
    const fields = ['id', 'name', 'contact', 'apartments', 'notes', 'data'].join(',');
    const response = await fetch(`${DIRECTUS_URL}/items/owners?fields=${fields}&sort=name&limit=200`);
    return handleResponse(response);
};

export const createOwner = async (ownerData: Omit<Owner, 'id'>): Promise<Owner> => {
    const response = await fetch(`${DIRECTUS_URL}/items/owners`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(ownerData),
    });
    return handleResponse(response);
}

export const updateOwner = async (id: string, ownerData: Partial<Owner>): Promise<Owner> => {
    const response = await fetch(`${DIRECTUS_URL}/items/owners/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(ownerData),
    });
    return handleResponse(response);
}

export const deleteOwner = async (id: string): Promise<void> => {
    const response = await fetch(`${DIRECTUS_URL}/items/owners/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
     if (!response.ok) {
        throw new Error('Failed to delete owner');
    }
}

// --- Owners Columns API ---

interface OwnersColumnRecord {
    id: string;
    name: string;
    type: ColumnType;
    required?: boolean | null;
    trackExpiration?: boolean | null;
    attributeType?: AttributeType | null;
    sort?: number | null;
}

type OwnersColumnPayload = {
    id: string;
    name: string;
    type: ColumnType;
    required?: boolean;
    trackExpiration?: boolean;
    attributeType?: AttributeType | null;
    sort?: number;
};

export const getColumns = async (): Promise<OwnersColumnRecord[]> => {
    const response = await fetch(`${DIRECTUS_URL}/items/owners_columns?sort=sort`);
    return handleResponse(response);
};

export const createColumn = async (columnData: OwnersColumnPayload): Promise<OwnersColumnRecord> => {
    const response = await fetch(`${DIRECTUS_URL}/items/owners_columns`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(columnData),
    });
    return handleResponse(response);
};

export const updateColumn = async (id: string, columnData: Partial<OwnersColumnPayload>): Promise<OwnersColumnRecord> => {
    const response = await fetch(`${DIRECTUS_URL}/items/owners_columns/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(columnData),
    });
    return handleResponse(response);
};

export const deleteColumn = async (id: string): Promise<void> => {
    const response = await fetch(`${DIRECTUS_URL}/items/owners_columns/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    if (!response.ok) {
        throw new Error('Failed to delete column');
    }
};


// --- File Upload API ---

export const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${DIRECTUS_URL}/files?fields=id,title,filesize,type,filename_disk,filename_download,uploaded_on`, {
        method: 'POST',
        headers: {
            // Note: Don't set Content-Type for FormData, the browser does it.
            'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
        },
        body: formData,
    });
    return handleResponse(response);
};

// --- Sync API (for offline support) ---

export const fetchOwners = async (): Promise<Owner[]> => {
    return getOwners();
};

export const fetchProjects = async (): Promise<Project[]> => {
    return getProjects();
};
