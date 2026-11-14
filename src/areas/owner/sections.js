// The admin panel's navigation, in one list: a new section is one more entry here (R24; design §3.0, §3.15).
// Area: owner

import SpaceDashboardOutlined from '@mui/icons-material/SpaceDashboardOutlined';
import PeopleOutline from '@mui/icons-material/PeopleOutline';
import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import GradingOutlined from '@mui/icons-material/GradingOutlined';
import DataUsageOutlined from '@mui/icons-material/DataUsageOutlined';
import ReportProblemOutlined from '@mui/icons-material/ReportProblemOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';

export const OWNER_SECTIONS = [
  { label: null, items: [{ text: 'Overview', icon: SpaceDashboardOutlined, path: '/owner', exact: true }] },
  {
    label: 'People',
    items: [
      { text: 'Users', icon: PeopleOutline, path: '/owner/users' },
      { text: 'Organizations', icon: ApartmentOutlined, path: '/owner/organizations' },
    ],
  },
  {
    label: 'Usage',
    items: [
      { text: 'Assessments', icon: GradingOutlined, path: '/owner/assessments' },
      { text: 'AI use', icon: DataUsageOutlined, path: '/owner/ai' },
    ],
  },
  { label: null, items: [{ text: 'Needs attention', icon: ReportProblemOutlined, path: '/owner/problems' }] },
];

// At the panel's foot, above the account button.
export const ACCESS_SECTION = { text: 'Access record', icon: HistoryOutlined, path: '/owner/access' };

// Whether an item is the current page: its own path, or a page under it (Overview only on its own).
export const isCurrent = (pathname, item) =>
  item.exact ? pathname === item.path : pathname === item.path || pathname.startsWith(`${item.path}/`);
