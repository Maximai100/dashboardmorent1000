import { useState, useEffect, useCallback } from 'react';
import type { Owner, Column, DocumentData, AttributeData } from '../types';
import { ColumnType, AttributeType } from '../types';
import * as directusService from '../services/directus';

type DirectusColumnRecord = Awaited<ReturnType<typeof directusService.getColumns>> extends Array<infer R> ? R : never;

const createDefaultDocumentData = (): DocumentData => ({
    status: 'Нет',
    versions: [],
    notes: '',
});

const createDefaultAttributeData = (): AttributeData => ({
    value: '',
});

const getDefaultValueForColumn = (column: Column): DocumentData | AttributeData => {
    if (column.type === ColumnType.DOCUMENT) {
        return createDefaultDocumentData();
    }
    if (column.type === ColumnType.ATTRIBUTE) {
        return createDefaultAttributeData();
    }
    throw new Error(`Unsupported column type "${column.type}" for default value`);
};

const SYSTEM_COLUMNS: Column[] = [
    { id: 'owner', name: 'Собственник', type: ColumnType.OWNER, sort: 0 },
];

const mapDirectusColumnToColumn = (record: DirectusColumnRecord): Column => {
    if (!record) {
        throw new Error('Received empty column record from Directus');
    }

    if (record.type === ColumnType.DOCUMENT) {
        return {
            id: record.id,
            name: record.name,
            type: ColumnType.DOCUMENT,
            required: Boolean(record.required),
            trackExpiration: Boolean(record.trackExpiration),
            sort: typeof record.sort === 'number' ? record.sort : undefined,
        };
    }

    if (record.type === ColumnType.ATTRIBUTE) {
        return {
            id: record.id,
            name: record.name,
            type: ColumnType.ATTRIBUTE,
            attributeType: record.attributeType ?? AttributeType.TEXT,
            sort: typeof record.sort === 'number' ? record.sort : undefined,
        };
    }

    return {
        id: record.id,
        name: record.name,
        type: record.type as ColumnType,
        sort: typeof record.sort === 'number' ? record.sort : undefined,
    };
};

const orderColumnsBySort = (columns: Column[]): Column[] => {
    return [...columns].sort((a, b) => {
        const aSort = typeof a.sort === 'number' ? a.sort : Number.POSITIVE_INFINITY;
        const bSort = typeof b.sort === 'number' ? b.sort : Number.POSITIVE_INFINITY;

        if (aSort === bSort) {
            return a.name.localeCompare(b.name);
        }

        return aSort - bSort;
    });
};

const assignSequentialSort = (columns: Column[]): Column[] =>
    columns.map((column, index) => ({ ...column, sort: index }));

const normalizeColumns = (columns: Column[]): Column[] => assignSequentialSort(orderColumnsBySort(columns));

export const useOwnersData = () => {
    const [owners, setOwners] = useState<Owner[]>([]);
    const [columns, setColumns] = useState<Column[]>([]);
    const [dynamicColumnIds, setDynamicColumnIds] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const persistColumnOrder = useCallback(async (orderedColumns: Column[], idsOverride?: string[]) => {
        const effectiveIds = idsOverride ?? dynamicColumnIds;
        if (effectiveIds.length === 0) return;
        const idsSet = new Set(effectiveIds);

        const payload = orderedColumns
            .filter(column => idsSet.has(column.id))
            .map((column, index) => ({ id: column.id, sort: index }));

        if (payload.length === 0) return;

        try {
            await Promise.all(
                payload.map(({ id, sort }) =>
                    directusService.updateColumn(id, { sort })
                )
            );
        } catch (err) {
            console.error('Failed to persist column order', err);
        }
    }, [dynamicColumnIds]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [ownersSettled, columnsSettled] = await Promise.allSettled([
                directusService.getOwners(),
                directusService.getColumns(),
            ]);

            const ownersResponse = ownersSettled.status === 'fulfilled' ? ownersSettled.value : [];
            const columnsResponse = columnsSettled.status === 'fulfilled' ? columnsSettled.value : [];

            const mappedColumns = (columnsResponse as any[]).map(mapDirectusColumnToColumn);
            const existingIds = new Set(mappedColumns.map(column => column.id));
            const systemColumns = SYSTEM_COLUMNS.filter(column => !existingIds.has(column.id)).map(column => ({
                ...column,
                sort: typeof column.sort === 'number' ? column.sort : -1,
            }));

            const orderedColumns = normalizeColumns([...systemColumns, ...mappedColumns]);
            setColumns(orderedColumns);
            setDynamicColumnIds(mappedColumns.map(column => column.id));

            const ownersUpdates: Array<{ id: string; data: Owner['data'] }> = [];
            const ownersWithDefaults: Owner[] = ownersResponse.map(owner => {
                const currentData = owner.data || {};
                const normalizedData: Owner['data'] = { ...currentData };
                let needsUpdate = false;

                orderedColumns.forEach(column => {
                    if (column.type === ColumnType.OWNER) return;
                    if (!(column.id in normalizedData)) {
                        normalizedData[column.id] = getDefaultValueForColumn(column);
                        needsUpdate = true;
                    }
                });

                if (needsUpdate) {
                    ownersUpdates.push({ id: owner.id, data: normalizedData });
                }

                return { ...owner, data: normalizedData };
            });

            if (ownersUpdates.length > 0) {
                const updatedOwners = await Promise.all(
                    ownersUpdates.map(({ id, data }) => directusService.updateOwner(id, { data }))
                );
                const updatedMap = new Map(updatedOwners.map(owner => [owner.id, owner]));
                setOwners(ownersWithDefaults.map(owner => updatedMap.get(owner.id) ?? owner));
            } else {
                setOwners(ownersWithDefaults);
            }

            // If owners loaded but columns failed, don't treat as fatal
            if (ownersSettled.status === 'fulfilled' && columnsSettled.status === 'rejected') {
                console.warn('Columns endpoint unavailable; showing system columns only.');
                setError(null);
            } else {
                setError(null);
            }
        } catch (err: any) {
            setError(err.message || 'Не удалось загрузить данные Directus');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const addOwner = async (newOwner: Omit<Owner, 'id'>) => {
        try {
            const createdOwner = await directusService.createOwner(newOwner);
            setOwners(prev => [createdOwner, ...prev]);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Не удалось создать собственника');
            throw err;
        }
    };

    const updateOwner = async (id: string, updatedOwnerData: Partial<Owner>) => {
        try {
            const updatedOwner = await directusService.updateOwner(id, updatedOwnerData);
            setOwners(prev => prev.map(o => (o.id === id ? { ...o, ...updatedOwner } : o)));
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Не удалось обновить собственника');
            throw err;
        }
    };
    
    const deleteOwner = async (id: string) => {
        try {
            await directusService.deleteOwner(id);
            setOwners(prev => prev.filter(o => o.id !== id));
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Не удалось удалить собственника');
            throw err;
        }
    };

    const addColumn = async (newColumn: Column) => {
        try {
            const nextSort = dynamicColumnIds.length;
            const payload = {
                id: newColumn.id,
                name: newColumn.name,
                type: newColumn.type,
                required: newColumn.type === ColumnType.DOCUMENT ? Boolean(newColumn.required) : undefined,
                trackExpiration: newColumn.type === ColumnType.DOCUMENT ? Boolean(newColumn.trackExpiration) : undefined,
                attributeType: newColumn.type === ColumnType.ATTRIBUTE ? newColumn.attributeType : undefined,
                sort: nextSort,
            };

            const createdColumnRecord = await directusService.createColumn(payload);
            const normalizedColumn = mapDirectusColumnToColumn(createdColumnRecord);

            const ownersToUpdate = owners
                .filter(owner => !(owner.data && owner.data[normalizedColumn.id]))
                .map(owner => {
                    const existingData = (owner.data ?? {}) as Owner['data'];
                    return {
                        id: owner.id,
                        data: {
                            ...existingData,
                            [normalizedColumn.id]: getDefaultValueForColumn(normalizedColumn),
                        } as Owner['data'],
                    };
                });

            if (ownersToUpdate.length > 0) {
                const updatedOwners = await Promise.all(
                    ownersToUpdate.map(({ id, data }) => directusService.updateOwner(id, { data }))
                );
                const updatedMap = new Map(updatedOwners.map(owner => [owner.id, owner]));
                setOwners(prev => prev.map(owner => updatedMap.get(owner.id) ?? owner));
            }

            let updatedColumns: Column[] = [];
            setColumns(prev => {
                const nextColumns = normalizeColumns([...prev, normalizedColumn]);
                updatedColumns = nextColumns;
                return nextColumns;
            });

            if (updatedColumns.length > 0) {
                const nextDynamicIds = [...dynamicColumnIds, normalizedColumn.id];
                await persistColumnOrder(updatedColumns, nextDynamicIds);
                setDynamicColumnIds(nextDynamicIds);
            }

            setError(null);
        } catch (err: any) {
            setError(err.message || 'Не удалось создать колонку');
            throw err;
        }
    };

    const deleteColumn = async (columnId: string) => {
        try {
            await directusService.deleteColumn(columnId);

            const ownersWithColumn = owners
                .filter(owner => owner.data && owner.data[columnId] !== undefined)
                .map(owner => {
                    const existingData = (owner.data ?? {}) as Owner['data'];
                    const updatedData: Owner['data'] = { ...existingData };
                    delete updatedData[columnId];
                    return { id: owner.id, data: updatedData };
                });

            if (ownersWithColumn.length > 0) {
                const updatedOwners = await Promise.all(
                    ownersWithColumn.map(({ id, data }) => directusService.updateOwner(id, { data }))
                );
                const updatedMap = new Map(updatedOwners.map(owner => [owner.id, owner]));
                setOwners(prev => prev.map(owner => updatedMap.get(owner.id) ?? owner));
            }

            let updatedColumns: Column[] = [];
            setColumns(prev => {
                const filtered = prev.filter(col => col.id !== columnId);
                const reordered = normalizeColumns(filtered);
                updatedColumns = reordered;
                return reordered;
            });

            if (updatedColumns.length > 0) {
                const nextDynamicIds = dynamicColumnIds.filter(id => id !== columnId);
                await persistColumnOrder(updatedColumns, nextDynamicIds);
                setDynamicColumnIds(nextDynamicIds);
            }

            setError(null);
        } catch (err: any) {
            setError(err.message || 'Не удалось удалить колонку');
            throw err;
        }
    };

    const reorderColumns = async (sourceColumnId: string, targetColumnId: string) => {
        if (sourceColumnId === targetColumnId) return;

        const currentColumns = [...columns];
        const sourceIndex = currentColumns.findIndex(column => column.id === sourceColumnId);
        const targetIndex = currentColumns.findIndex(column => column.id === targetColumnId);

        if (sourceIndex === -1 || targetIndex === -1) {
            return;
        }

        const nextColumns = [...currentColumns];
        const [movedColumn] = nextColumns.splice(sourceIndex, 1);
        nextColumns.splice(targetIndex, 0, movedColumn);

        const reorderedColumns = assignSequentialSort(nextColumns);

        setColumns(reorderedColumns);

        if (reorderedColumns.length > 0) {
            await persistColumnOrder(reorderedColumns);
            setDynamicColumnIds(reorderedColumns.filter(column => dynamicColumnIds.includes(column.id)).map(column => column.id));
        }
    };

    return {
        owners,
        columns,
        loading,
        error,
        addOwner,
        updateOwner,
        deleteOwner,
        addColumn,
        deleteColumn,
        reorderColumns,
    };
};
