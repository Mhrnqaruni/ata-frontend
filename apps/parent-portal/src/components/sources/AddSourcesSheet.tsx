import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { UploadTab } from './UploadTab';
import { LinkTab } from './LinkTab';
import { PasteTab } from './PasteTab';
import { GoogleDriveTab } from './GoogleDriveTab';
import { ResearchTab } from './ResearchTab';
import { DatabaseTab } from './DatabaseTab';
import { MAX_SOURCES } from '../../lib/api/sources';

interface AddSourcesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  sourcesCount: number;
  onUpload: (files: FileList | File[]) => Promise<void>;
  onAddUrl: (url: string) => Promise<void>;
  onAddText: (content: string, name: string) => Promise<void>;
  onAddResearch: (topic: string, description: string, links: string[]) => Promise<void>;
  onAddDatabase: (connectionId: string, name?: string, description?: string) => Promise<void>;
  onImportComplete: () => void;
  uploading: boolean;
  isParentWorkspace?: boolean;
}

const tabClassName =
  'px-4 py-2 rounded-md border border-border bg-secondary text-foreground cursor-pointer transition-all hover:bg-accent data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground';

export const AddSourcesSheet: React.FC<AddSourcesSheetProps> = ({
  open,
  onOpenChange,
  projectId,
  sourcesCount,
  onUpload,
  onAddUrl,
  onAddText,
  onAddResearch,
  onAddDatabase,
  onImportComplete,
  uploading,
  isParentWorkspace = false,
}) => {
  const isAtLimit = sourcesCount >= MAX_SOURCES;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[500px] sm:w-[600px]">
        <SheetHeader>
          <SheetTitle>Add sources</SheetTitle>
        </SheetHeader>

        <div className="mt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Sources let the ATA parent workspace ground chat and generators in the uploaded study materials.
            ({sourcesCount}/{MAX_SOURCES} used)
          </p>

          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="w-full h-auto flex flex-wrap gap-2 bg-transparent p-0">
              <TabsTrigger value="upload" className={tabClassName}>Upload</TabsTrigger>
              {!isParentWorkspace ? <TabsTrigger value="link" className={tabClassName}>Link</TabsTrigger> : null}
              <TabsTrigger value="paste" className={tabClassName}>Paste</TabsTrigger>
              {!isParentWorkspace ? <TabsTrigger value="drive" className={tabClassName}>Drive</TabsTrigger> : null}
              {!isParentWorkspace ? <TabsTrigger value="research" className={tabClassName}>Research</TabsTrigger> : null}
              {!isParentWorkspace ? <TabsTrigger value="database" className={tabClassName}>Database</TabsTrigger> : null}
            </TabsList>

            <TabsContent value="upload" className="mt-6">
              <UploadTab
                onUpload={onUpload}
                uploading={uploading}
                isAtLimit={isAtLimit}
                isParentWorkspace={isParentWorkspace}
              />
            </TabsContent>

            {!isParentWorkspace ? (
              <TabsContent value="link" className="mt-6">
                <LinkTab onAddUrl={onAddUrl} isAtLimit={isAtLimit} />
              </TabsContent>
            ) : null}

            <TabsContent value="paste" className="mt-6">
              <PasteTab onAddText={onAddText} isAtLimit={isAtLimit} />
            </TabsContent>

            {!isParentWorkspace ? (
              <TabsContent value="drive" className="mt-6">
                <GoogleDriveTab
                  projectId={projectId}
                  onImportComplete={() => {
                    onImportComplete();
                    onOpenChange(false);
                  }}
                  isAtLimit={isAtLimit}
                />
              </TabsContent>
            ) : null}

            {!isParentWorkspace ? (
              <TabsContent value="research" className="mt-6">
                <ResearchTab onAddResearch={onAddResearch} isAtLimit={isAtLimit} />
              </TabsContent>
            ) : null}

            {!isParentWorkspace ? (
              <TabsContent value="database" className="mt-6">
                <DatabaseTab
                  isAtLimit={isAtLimit}
                  onAddDatabase={async (connectionId, name, description) => {
                    await onAddDatabase(connectionId, name, description);
                    onImportComplete();
                    onOpenChange(false);
                  }}
                />
              </TabsContent>
            ) : null}
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};
