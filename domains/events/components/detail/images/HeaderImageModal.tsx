import * as React from 'react';
import { useFeatureFlag } from '../../../../../lib/featureFlags';
import { useHeaderImageSearch } from '../../../hooks/useHeaderImageSearch';
import { useHeaderImageSelection } from '../../../hooks/useHeaderImageSelection';
import { HeaderImageModalFooter } from './HeaderImageModalFooter';
import { HeaderImageModalHeader } from './HeaderImageModalHeader';
import { HeaderImageResultsGrid } from './HeaderImageResultsGrid';
import { HeaderImageSearchForm } from './HeaderImageSearchForm';
import { HeaderImageUploadPanel } from './HeaderImageUploadPanel';

type HeaderImageSource = 'search' | 'upload';

type HeaderImageModalProps = {
  eventId: string;
  defaultQuery: string;
  initialSelectedUrl?: string;
  onClose: () => void;
  onUpdate: (imageUrl: string) => Promise<void> | void;
};

export const HeaderImageModal: React.FC<HeaderImageModalProps> = ({
  eventId,
  defaultQuery,
  initialSelectedUrl,
  onClose,
  onUpdate,
}) => {
  const uploadEnabled = useFeatureFlag('eventBannerUpload');
  const [source, setSource] = React.useState<HeaderImageSource>('search');
  const { query, setQuery, results, isLoading, error, runSearch } =
    useHeaderImageSearch(defaultQuery);
  const { selectedUrl, setSelectedUrl, isSaving, handleConfirm } = useHeaderImageSelection({
    initialSelectedUrl,
    onUpdate,
    onClose,
  });

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-stretch justify-stretch">
      <div className="bg-surface w-full h-full overflow-hidden flex flex-col">
        <HeaderImageModalHeader title="Choose header image" onClose={onClose} />

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-4">
          {uploadEnabled ? (
            <div className="inline-flex rounded-xl border border-slate-700 bg-slate-900/60 p-1">
              <button
                type="button"
                onClick={() => setSource('search')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  source === 'search' ? 'bg-primary text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setSource('upload')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  source === 'upload' ? 'bg-primary text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Upload
              </button>
            </div>
          ) : null}

          {uploadEnabled && source === 'upload' ? (
            <HeaderImageUploadPanel
              eventId={eventId}
              selectedUrl={selectedUrl}
              onUploaded={setSelectedUrl}
            />
          ) : (
            <>
              <HeaderImageSearchForm
                query={query}
                onQueryChange={setQuery}
                onSubmit={() => runSearch(query)}
              />

              {error ? (
                <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                  {error}
                </div>
              ) : null}

              {!isLoading && results.length === 0 ? (
                <div className="text-sm text-slate-400">No results. Try a different search.</div>
              ) : null}

              <HeaderImageResultsGrid
                results={results}
                selectedUrl={selectedUrl}
                onSelect={setSelectedUrl}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <HeaderImageModalFooter
          onCancel={onClose}
          onConfirm={handleConfirm}
          isSaving={isSaving}
          canSave={!!selectedUrl}
        />
      </div>
    </div>
  );
};
