import React from 'react';
import type { Owner, Column, ModalData } from '../types';
import Dashboard from './Dashboard';
import OwnerCard from './mobile/OwnerCard';
import { useIsMobile } from '../hooks/useMediaQuery';
import { SpinnerIcon, TableCellsIcon } from './icons/Icons';

interface ResponsiveDashboardProps {
    owners: Owner[];
    columns: Column[];
    onCellClick: (data: ModalData) => void;
    onAddColumn: () => void;
    onDeleteColumn: (columnId: string) => Promise<void> | void;
    sortConfig: { key: string | null; direction: 'asc' | 'desc' };
    onSort: (columnId: string) => void;
    onReorderColumns: (sourceColumnId: string, targetColumnId: string) => void;
    loading: boolean;
    error: string | null;
}

const ResponsiveDashboard: React.FC<ResponsiveDashboardProps> = (props) => {
    const isMobile = useIsMobile();
    const { owners, onCellClick, loading, error } = props;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 bg-slate-800 rounded-lg shadow-md">
                <SpinnerIcon className="w-8 h-8 animate-spin text-blue-500 mb-3" />
                <p className="text-sm text-slate-400">Загружаем данные...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-16 bg-red-900/20 border border-red-500/30 rounded-lg">
                <h3 className="text-lg font-medium text-red-400">Ошибка при загрузке данных</h3>
                <p className="mt-1 text-sm text-slate-400">{error}</p>
                <p className="mt-2 text-xs text-slate-500">Попробуйте обновить страницу или проверьте настройки Directus.</p>
            </div>
        );
    }

    if (!isMobile) {
        return <Dashboard {...props} />;
    }

    // Mobile card view
    if (owners.length === 0) {
        return (
            <div className="text-center py-16 bg-slate-800 rounded-lg shadow-md">
                <TableCellsIcon className="mx-auto h-12 w-12 text-slate-500" />
                <h3 className="mt-2 text-lg font-medium text-white">Нет данных о собственниках</h3>
                <p className="mt-1 text-sm text-slate-400">Начните с добавления информации о собственнике.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 pb-20">
            {owners.map((owner) => (
                <OwnerCard
                    key={owner.id}
                    owner={owner}
                    onTap={() => onCellClick({ type: 'owner', id: owner.id })}
                />
            ))}
        </div>
    );
};

export default ResponsiveDashboard;
