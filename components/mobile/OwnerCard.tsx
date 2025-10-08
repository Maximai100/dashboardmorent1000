import React from 'react';
import type { Owner, DocumentData } from '../../types';
import { PhoneIcon, EnvelopeIcon } from '../icons/Icons';

interface OwnerCardProps {
  owner: Owner;
  onTap: () => void;
}

const OwnerCard: React.FC<OwnerCardProps> = ({ owner, onTap }) => {
  const documents = Object.values(owner.data || {}).filter(
    (entry): entry is DocumentData => !!entry && typeof entry === 'object' && 'status' in entry
  );

  const totalDocuments = documents.length;
  const completedDocuments = documents.filter(doc => doc.status === 'Есть').length;
  const expiringSoon = documents.filter(doc => doc.status === 'Скоро истекает').length;
  const expiredDocuments = documents.filter(doc => doc.status === 'Истек').length;
  const progress = totalDocuments === 0 ? 0 : Math.round((completedDocuments / totalDocuments) * 100);

  let statusBadgeColor = 'bg-yellow-500';
  if (completedDocuments === 0) statusBadgeColor = 'bg-red-500';
  if (completedDocuments === totalDocuments && totalDocuments > 0) statusBadgeColor = 'bg-green-500';

  const primaryApartment = owner.apartments?.[0];
  const contactsCount = owner.contact?.length || 0;

  return (
    <div
      onClick={onTap}
      className="bg-slate-800 rounded-xl px-4 py-5 shadow-lg shadow-black/30 border border-slate-700 active:bg-slate-700/90 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate">{owner.name}</h3>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {primaryApartment && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-900/60 text-blue-200 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                {primaryApartment}
              </span>
            )}
            {owner.apartments && owner.apartments.length > 1 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-700 text-slate-200 text-xs font-medium">
                +{owner.apartments.length - 1} ап.
              </span>
            )}
          </div>
        </div>
        <div className={`flex-shrink-0 w-3 h-3 rounded-full ${statusBadgeColor} mt-1`} />
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span>Документы: {completedDocuments}/{totalDocuments || '—'}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        {(expiringSoon > 0 || expiredDocuments > 0) && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {expiringSoon > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 text-amber-300">
                ⏳ {expiringSoon} скоро истекает
              </span>
            )}
            {expiredDocuments > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-300">
                ⚠️ {expiredDocuments} просрочено
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          {contactsCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <PhoneIcon className="w-4 h-4 text-slate-500" />
              <span>{contactsCount}</span>
            </span>
          )}
          {owner.contact?.some(contact => contact.type.toLowerCase().includes('mail') || contact.type.toLowerCase().includes('поч')) && (
            <span className="inline-flex items-center gap-1">
              <EnvelopeIcon className="w-4 h-4 text-slate-500" />
              <span>почта</span>
            </span>
          )}
        </div>
        <svg className="w-5 h-5 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
};

export default OwnerCard;
