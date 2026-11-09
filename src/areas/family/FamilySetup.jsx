// The first run at /family while there's no child yet (Phase 1.38 design §2.4): no sidebar or tab bar, one welcome card
// with the three ways and Add your child, which opens the add dialog. FamilyStart shows it, and the list's error.
// Area: family

import { Alert, Button, IconButton, Typography } from '@mui/material';
import PersonAddOutlined from '@mui/icons-material/PersonAddOutlined';
import { useQuery } from '@tanstack/react-query';
import AccountMenu from '../../components/common/AccountMenu';
import logo from '../../assets/mst_logo_no_bg.png';
import { useAuth } from '../../hooks/useAuth';
import { hasMode } from '../../services/accountModes';
import { sessionGeneration } from '../../services/queryCache';
import ChildDialogs from './child/ChildDialogs';
import { familyApi, familyKeys } from './familyApi';
import FamilyLoading from './FamilyLoading';
import { SECTIONS } from './sections';
import useDialogParam from './useDialogParam';
import './family.css';
import './child/home.css';

// The three ways, in the sidebar's order with its icons and names; equal tiles, so none looks switched off.
const WAYS = [
  ['notebook', 'Ask about anything they’re learning, and get step-by-step answers.'],
  ['homework', 'Take a photo of finished homework. AI marks it and explains mistakes.'],
  ['activities', 'Quizzes, flashcards, mind maps and stories made for them.'],
].map(([id, text]) => ({ ...SECTIONS.find((section) => section.id === id), text }));

export default function FamilySetup() {
  const { user } = useAuth();
  const enabled = hasMode(user, 'parent');
  const children = useQuery({
    queryKey: familyKeys.children(sessionGeneration(), user?.id),
    enabled: !!user?.id && enabled,
    queryFn: ({ signal }) => familyApi.children({ signal }),
  });
  const [, showAdd] = useDialogParam('add-child');
  const rows = children.data?.filter((child) => child.isActive !== false) || [];
  const firstRun = enabled && children.isSuccess && rows.length === 0;
  const name = user?.fullName || user?.full_name || user?.email || 'Your account';
  if (children.isPending) return <FamilyLoading />;
  return (
    <div className="fam-first">
      <header className="fam-first-top" data-mst="family-top">
        <img src={logo} alt="MySmartTeach" className="fam-first-logo" />
        {/* Teacher's account menu (Teacher mode and Sign out stay reachable), behind its tinted avatar. */}
        <AccountMenu
          renderButton={(props) => (
            <IconButton className="fam-phone-account" aria-label={`Account: ${name}`} {...props}>
              <span className="mst-avatar" aria-hidden>
                {name.trim().charAt(0).toUpperCase() || '?'}
              </span>
            </IconButton>
          )}
        />
      </header>
      {children.isError ? (
        <main className="fam-first-main">
          <Alert severity="error" action={<Button onClick={() => children.refetch()}>Try again</Button>}>
            Could not load your children.
          </Alert>
        </main>
      ) : firstRun ? (
        <main className="fam-first-main">
          <section className="mst-g1 mst-rim fam-first-card" aria-labelledby="fam-first-title">
            <Typography id="fam-first-title" component="h1" variant="h1">
              Welcome to parent mode
            </Typography>
            <p className="fam-first-lead">Help your child at home, in three simple ways.</p>
            <ul className="fam-first-ways">
              {WAYS.map((way) => {
                const Icon = way.icon;
                return (
                  <li key={way.id} className="fam-first-way">
                    <span className="mst-tile" data-size="lg" aria-hidden>
                      <Icon />
                    </span>
                    <span className="fam-first-way-text">
                      <span className="fam-first-way-name">{way.label}</span>
                      <span className="fam-first-way-sentence">{way.text}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={<PersonAddOutlined />}
              onClick={showAdd}
              data-mst="family-first-add"
            >
              Add your child
            </Button>
            <p className="fam-first-note">
              Next: your child’s first name and school year. That’s all. You can add more children later.
            </p>
          </section>
        </main>
      ) : null}
      {/* The add dialog (?dialog=add-child); after saving, the new child's Home takes this page's place. */}
      <ChildDialogs child={null} children={rows} />
    </div>
  );
}
