// One child's Notebook (Phase 1.38 design §4.3, §4.8–4.9): teacher's chat beside a 320 px panel from 1200 px, or teacher's
// Chat · Materials · Make tabs below it. Results, making, uploads and topics open from the address, as before.
// Area: family

import { useState } from 'react';
import { Alert, Button, Tab, Tabs, useMediaQuery } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { sessionGeneration } from '../../services/queryCache';
import FamilyConversation from './FamilyConversation';
import FamilyLoading from './FamilyLoading';
import { familyApi, familyKeys } from './familyApi';
import { materialName } from './familyPresentation';
import { isRunning as active } from './familyWords';
import MakeDialog from './make/MakeDialog';
import TopicPicker from './make/TopicPicker';
import { stageFiles } from './make/UploadDialog';
import ChatHeader from './notebook/ChatHeader';
import MakePanel from './notebook/MakePanel';
import MaterialsPanel from './notebook/MaterialsPanel';
import { makePreset, makeSource } from './notebook/notebookWords';
import useArrivingQuestion from './notebook/useArrivingQuestion';
import { resultPath } from './sections';
import { useOpenDialog } from './useDialogParam';
import useFamilyChats from './useFamilyChats';

const PANES = [
  ['chat', 'Chat'],
  ['materials', 'Materials'],
  ['make', 'Make'],
];

/** `isNew(id)` is the shell's New mark for a made thing (useNewMarks). */
export default function FamilyLearning({ child, isNew }) {
  const { user } = useAuth();
  const generation = sessionGeneration();
  const location = useLocation();
  const home = useQuery({
    queryKey: familyKeys.home(generation, user.id, child.id),
    queryFn: ({ signal }) => familyApi.home(child.id, { signal }),
    // As today, it polls while something is being made or a material is being read, so the chat's rows stay current.
    refetchInterval: (query) =>
      query.state.data?.activities.some(active) ||
      query.state.data?.materials.some((item) => ['queued', 'extracting'].includes(item.indexing?.status))
        ? 3000
        : false,
  });
  const chats = useFamilyChats(child);
  const selectedIds = chats.data?.materialIds || []; // A missing recent-list entry is not deselection.
  const setSelectedSources = (ids) => chats.setSources(ids);
  const [questionSuggestion, setQuestionSuggestion] = useState(null);
  // The panel beside the chat from 1200 px; below it, one pane at a time (design §4.3). The phone row under 900 px.
  const wide = useMediaQuery('(min-width:1200px)', { noSsr: true });
  const computer = useMediaQuery('(min-width:900px)', { noSsr: true });
  const sheet = useMediaQuery('(max-width:599px)', { noSsr: true });
  const [pane, setPane] = useState('chat');
  // A result's Ask about this or Explain in chat arrives with its question (C-14), taken once the chat has loaded and
  // its ?chat= is in the address, so forgetting the question keeps it.
  useArrivingQuestion(!!chats.data && !!new URLSearchParams(location.search).get('chat'), (question) => {
    setQuestionSuggestion(question);
    setPane('chat');
  });
  const recentSources = home.data?.materials || [];
  const linkedSources = useQueries({
    queries: selectedIds
      .filter((id) => !recentSources.some((source) => source.id === id))
      .map((id) => ({
        queryKey: familyKeys.material(generation, user.id, child.id, id),
        queryFn: ({ signal }) => familyApi.material(child.id, id, { signal }),
      })),
  });
  const sources = [...recentSources, ...linkedSources.map((query) => query.data).filter(Boolean)].map((item) => ({
    ...item,
    title: materialName(item),
  }));
  const openDialog = useOpenDialog();
  const canChat = !!chats.data?.turns.some((t) => t.activity.status === 'completed');
  const source = makeSource({ canChat, ticked: selectedIds.length });
  // Each tile opens today's make dialog for its kind, with the panel's source already chosen (design §4.8).
  const openMake = (kind) => openDialog(`make-${kind}`, { make: makePreset(source, selectedIds) });
  // A new upload joins this chat, as today, and files the paperclip picked are handed over with it.
  const openUpload = (files, options) =>
    openDialog(
      'upload',
      { upload: { chatId: chats.id, files: files?.length ? stageFiles(files) : undefined } },
      options
    );
  function toggleSource(id, checked) {
    setSelectedSources(checked ? [...selectedIds, id] : selectedIds.filter((x) => x !== id));
  }
  // A made thing opens its result at its own address, whose back link and Explain in chat return to this chat (C-14).
  const resultLink = (row) => ({
    to: resultPath(child.id, row),
    state: { from: location.pathname + location.search },
  });
  // "Make a quiz on this" on a material: today's quiz dialog with that material ticked.
  function quizFrom(ids, options) {
    setSelectedSources(ids);
    openDialog('make-quiz', { make: { materialIds: ids, basis: 'materials' } }, options);
  }
  if (home.isPending) return <FamilyLoading variant="body" label="Opening the Assistant" />;
  if (home.isError && (!home.data || [403, 404].includes(home.error?.response?.status)))
    return (
      <div className="fam-nb-message">
        <Alert
          severity="error"
          action={
            <Button variant="outlined" onClick={() => home.refetch()}>
              Try again
            </Button>
          }
        >
          The Assistant couldn’t load. Check the connection, then try again.
        </Alert>
      </div>
    );
  const narrow = !wide;
  // Below 1200 px each part is a tab's panel; from 1200 px they're all on screen and need no tab roles.
  const panel = (id) => (narrow ? { role: 'tabpanel', id: `fam-nb-${id}`, 'aria-labelledby': `fam-nb-tab-${id}` } : {});
  const Side = wide ? 'aside' : 'div';
  return (
    <div className="fam-nb" data-wide={wide}>
      {narrow && (
        <Tabs
          value={pane}
          onChange={(e, value) => setPane(value)}
          variant="fullWidth"
          className="fam-nb-tabs"
          aria-label="Assistant"
          data-mst="family-notebook-tabs"
        >
          {PANES.map(([id, label]) => (
            <Tab
              key={id}
              value={id}
              label={label}
              id={`fam-nb-tab-${id}`}
              aria-controls={`fam-nb-${id}`}
              data-mst={id}
            />
          ))}
        </Tabs>
      )}
      <ChatHeader child={child} chat={chats} compact={!computer} sheet={sheet} />
      <div className="fam-nb-chat-area" hidden={narrow && pane !== 'chat'} {...panel('chat')}>
        {home.isError && (
          <Alert severity="warning" className="fam-nb-banner">
            Couldn’t refresh. Showing what was saved.
          </Alert>
        )}
        {chats.error && (
          <Alert severity="error" className="fam-nb-banner">
            {chats.error}
          </Alert>
        )}
        <FamilyConversation
          key={`${child.id}:${chats.id || 'loading'}`}
          chat={chats}
          child={child}
          suggestion={questionSuggestion}
          materials={sources.filter((s) => selectedIds.includes(s.id))}
          materialIds={selectedIds}
          activities={home.data?.activities || []}
          attempts={home.data?.attempts || []}
          isNew={isNew}
          resultLink={resultLink}
          onMaterials={() => setPane('materials')}
          onUpload={(files) => openUpload(files)}
          narrow={narrow}
        />
      </div>
      <Side
        className={wide ? 'fam-nb-panel mst-g1 mst-rim' : 'fam-nb-panel'}
        hidden={narrow && pane === 'chat'}
        aria-label={wide ? `Make practice and materials for ${child.displayName}` : undefined}
      >
        <div hidden={narrow && pane !== 'make'} {...panel('make')}>
          <MakePanel
            name={child.displayName}
            source={source}
            ticked={selectedIds.length}
            onMake={openMake}
            disabled={!chats.data}
            rows={narrow}
          />
        </div>
        {wide && <hr className="fam-nb-rule" />}
        <div hidden={narrow && pane !== 'materials'} {...panel('materials')}>
          {/* Homework photos are in Homework (B2b 8a); the make dialog still lists them. */}
          <MaterialsPanel
            child={child}
            sources={sources.filter((item) => item.purpose !== 'work')}
            selectedIds={selectedIds}
            chatBusy={chats.busy}
            onToggle={toggleSource}
            onQuiz={quizFrom}
            onUpload={() => openUpload()}
            onPickTopic={() => openDialog('topics')}
          />
        </div>
      </Side>
      <MakeDialog
        child={child}
        mode="notebook"
        chat={{ id: chats.id, revision: chats.data?.revision, materialIds: selectedIds, canChat }}
        onMade={() => setPane('chat')}
      />
      {/* The picker's "Add a photo or PDF" opens the upload dialog in the picker's place in the history. */}
      <TopicPicker
        child={child}
        sources={sources}
        onChosen={(id) => {
          setSelectedSources([id]);
          setPane('chat');
        }}
        onUpload={() => openUpload(undefined, { replace: true })}
      />
    </div>
  );
}
