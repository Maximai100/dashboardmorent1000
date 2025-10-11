import React, { useState } from 'react';
import BottomSheet from './BottomSheet';
import { PlusIcon, UserPlusIcon, DocumentTextIcon, XMarkIcon } from '../icons/Icons';

interface FloatingActionsProps {
    onAddOwner: () => void;
    onAddColumn: () => void;
    disabled?: boolean;
}

const FloatingActions: React.FC<FloatingActionsProps> = ({ onAddOwner, onAddColumn, disabled = false }) => {
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const handleOpen = () => {
        if (!disabled) {
            setIsSheetOpen(true);
        }
    };

    const handleClose = () => setIsSheetOpen(false);

    const handleAction = (action: () => void) => {
        action();
        handleClose();
    };

    return (
        <>
            <button
                type="button"
                onClick={handleOpen}
                disabled={disabled}
                className="lg:hidden fixed right-5 z-40 inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 active:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ bottom: 'calc(5.5rem + var(--safe-area-inset-bottom))' }}
                aria-label="Действия"
            >
                {isSheetOpen ? (
                    <XMarkIcon className="w-6 h-6" />
                ) : (
                    <PlusIcon className="w-6 h-6" />
                )}
            </button>

            <BottomSheet isOpen={isSheetOpen} onClose={handleClose} title="Быстрые действия">
                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={() => handleAction(onAddOwner)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-700/70 border border-slate-600 text-left text-white active:bg-slate-600 transition-colors"
                    >
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600/20 text-blue-300">
                            <UserPlusIcon className="w-5 h-5" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold">Добавить собственника</p>
                            <p className="text-xs text-slate-400">ФИО, контакты, апартаменты и заметки</p>
                        </div>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleAction(onAddColumn)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-700/70 border border-slate-600 text-left text-white active:bg-slate-600 transition-colors"
                    >
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-600/20 text-emerald-300">
                            <DocumentTextIcon className="w-5 h-5" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold">Новая колонка</p>
                            <p className="text-xs text-slate-400">Документ или атрибут для всех собственников</p>
                        </div>
                    </button>
                </div>
            </BottomSheet>
        </>
    );
};

export default FloatingActions;
