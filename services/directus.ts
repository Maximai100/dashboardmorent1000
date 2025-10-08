import { DIRECTUS_URL, DIRECTUS_TOKEN } from '../config';
import type { Project } from '../types/manager';
import type { Owner } from '../types';

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

// --- Projects API ---

export const getProjects = async (): Promise<Project[]> => {
    // Fetch projects and their related attachments (files) in one go.
    // Use deep parameter to request nested relation fields, avoiding potential fields parser issues.
    const response = await fetch(`${DIRECTUS_URL}/items/projects?fields=*&deep[attachments][_fields]=*,directus_files_id.*`);
    return handleResponse(response);
};

export const getProjectAttachments = async (projectId: string): Promise<ProjectAttachment[]> => {
    // Get attachments for a specific project with explicit field selection
    const response = await fetch(`${DIRECTUS_URL}/items/projects_files?filter[projects_id][_eq]=${projectId}&fields=id,projects_id,directus_files_id,url,title`);
    return handleResponse(response);
};

export const createProject = async (projectData: Omit<Project, 'id'>): Promise<Project> => {
    // For new projects, exclude all JSON fields that might cause issues
    const { history, tags, status, ...baseData } = projectData;
    
    const formattedData = {
        ...baseData,
        // Only include JSON fields if they have actual data
        ...(history && history.length > 0 ? { history } : {}),
        ...(tags && tags.length > 0 ? { tags } : {}),
        ...(status ? { status } : {}),
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
    // Request the updated project back with deep-expanded attachments
    const response = await fetch(`${DIRECTUS_URL}/items/projects/${id}?fields=*&deep[attachments][_fields]=*,directus_files_id.*`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(projectData),
    });
    return handleResponse(response);
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
    const response = await fetch(`${DIRECTUS_URL}/items/owners`);
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


// --- File Upload API ---

export const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${DIRECTUS_URL}/files`, {
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
