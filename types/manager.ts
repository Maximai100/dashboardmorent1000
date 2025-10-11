export enum ProjectStatus {
    InProgress = 'в работе',
    Completed = 'завершено',
    Archived = 'архив',
}

// Represents the structure of a file object returned from Directus Files collection
export interface DirectusFile {
    id: string;
    title: string;  // Native Directus field (lowercase)
    filesize: number;
    type: string; // Mime type
    filename_disk: string;
    uploaded_on: string;
    URL?: string;   // Custom field for links (uppercase in Directus)
}

// Represents the M2M relationship item for attachments, which can be a file or a link
export interface ProjectAttachment {
    id: number; // ID of the junction table row (integer)
    projects_id: string | number;
    directus_files_id?: DirectusFile | string; // Can be a full file object or just an ID string
    url?: string; // A URL for a link attachment (lowercase for local state)
    URL?: string | null; // Directus uses uppercase field name
    title?: string; // A title for a link attachment (lowercase for local state)
}

export interface HistoryLog {
    id: string;
    timestamp: string; // ISO string
    user: string;
    action: string;
}

export interface Project {
    id: string;
    name: string;
    responsible: string;
    deadline: string; // ISO string
    status?: ProjectStatus | null; // Optional for new projects
    // attachments can now contain both files and links
    attachments: ProjectAttachment[];
    notes: string;
    director_comment?: string | null;
    history?: HistoryLog[] | null; // Optional for new projects
    tags?: string[] | null; // Optional for new projects
}
