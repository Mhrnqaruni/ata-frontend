// The panel's table: a toolbar, sortable heads, rows that open their page, a pinned name column and paging.
// Sorting has three states (Carbon): first click, second click, then back to the page's default (§3.3, §3.13).
// Area: owner

import { useNavigate } from 'react-router-dom';
import {
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
} from '@mui/material';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';

// The next sort after a click on a column: its first order, then the other, then none (the page's default).
export function nextSort(sort, column) {
  const first = column.firstOrder || (column.numeric ? 'desc' : 'asc');
  if (sort?.key !== column.key) return { key: column.key, order: first };
  if (sort.order === first) return { key: column.key, order: first === 'desc' ? 'asc' : 'desc' };
  return null;
}

function Paging({ page, onPage }) {
  if (!page || page.total <= page.pageSize) return null;
  const first = (page.page - 1) * page.pageSize + 1;
  const last = Math.min(page.total, page.page * page.pageSize);
  return (
    <footer className="owner-table-foot">
      <span>
        {first.toLocaleString('en-GB')}–{last.toLocaleString('en-GB')} of {page.total.toLocaleString('en-GB')}
      </span>
      <Button disabled={page.page <= 1} onClick={() => onPage(page.page - 1)} size="small">
        Previous
      </Button>
      <Button disabled={last >= page.total} onClick={() => onPage(page.page + 1)} size="small">
        Next
      </Button>
    </footer>
  );
}

// How a column takes its width (design review D6): the title column (`grow`) takes the rest and wraps to 2 lines;
// reasons and names keep their own; every other column fits its content.
const wraps = (column) => column.grow || /owner-(wrap|name-cell)/.test(column.className || '');
const cellClass = (column) => [column.className, wraps(column) ? null : 'owner-fit'].filter(Boolean).join(' ');

function Head({ columns, groups, sort, onSort, linked }) {
  return (
    <TableHead>
      {groups ? (
        <TableRow className="owner-table-groups">
          {groups.map((group) => (
            <TableCell colSpan={group.span} key={group.label || group.span}>
              {group.label}
            </TableCell>
          ))}
          {linked ? <TableCell /> : null}
        </TableRow>
      ) : null}
      <TableRow>
        {columns.map((column) => (
          <TableCell
            align={column.numeric ? 'right' : 'left'}
            className={cellClass(column)}
            key={column.key}
            sortDirection={sort?.key === column.key ? sort.order : false}
          >
            {column.sortable && onSort ? (
              <TableSortLabel
                active={sort?.key === column.key}
                direction={sort?.key === column.key ? sort.order : column.firstOrder || 'desc'}
                hideSortIcon
                onClick={() => onSort(nextSort(sort, column))}
              >
                {column.label}
              </TableSortLabel>
            ) : (
              column.label
            )}
          </TableCell>
        ))}
        {linked ? <TableCell aria-label="Open" className="owner-table-chevron" /> : null}
      </TableRow>
    </TableHead>
  );
}

export default function OwnerTable({
  label,
  columns,
  rows,
  rowKey,
  rowTo,
  sort,
  onSort,
  page,
  onPage,
  toolbar,
  caption,
  groups,
  empty,
  loading,
  refreshing,
}) {
  const navigate = useNavigate();
  const width = columns.length + (rowTo ? 1 : 0);
  let body;
  if (loading) {
    body = [0, 1, 2, 3].map((n) => (
      <TableRow key={n}>
        <TableCell colSpan={width}>
          <Skeleton height={24} />
        </TableCell>
      </TableRow>
    ));
  } else if (!rows.length) {
    body = (
      <TableRow>
        <TableCell className="owner-table-empty" colSpan={width}>
          {empty}
        </TableCell>
      </TableRow>
    );
  } else {
    body = rows.map((row) => {
      const to = rowTo?.(row);
      return (
        <TableRow
          className={to ? 'owner-table-link' : undefined}
          hover={Boolean(to)}
          key={rowKey(row)}
          onClick={to ? (event) => !event.defaultPrevented && navigate(to) : undefined}
        >
          {columns.map((column) => {
            const content = column.render ? column.render(row) : row[column.key];
            const title = typeof content === 'string' ? content : undefined;
            // A title wraps to 2 lines; other text stays on one line, ending in "…", whole on hover.
            let shown = content;
            if (column.grow)
              shown = (
                <span className="owner-cell-grow" title={title}>
                  {content}
                </span>
              );
            else if (!column.numeric && !wraps(column))
              shown = (
                <span className="owner-cell" title={title}>
                  {content}
                </span>
              );
            return (
              <TableCell align={column.numeric ? 'right' : 'left'} className={cellClass(column)} key={column.key}>
                {shown}
              </TableCell>
            );
          })}
          {to ? (
            <TableCell className="owner-table-chevron">
              <ChevronRightRounded aria-hidden="true" />
            </TableCell>
          ) : null}
        </TableRow>
      );
    });
  }
  return (
    <section className="owner-card owner-table-card" data-refreshing={refreshing ? 'true' : undefined}>
      {toolbar ? <div className="owner-table-toolbar">{toolbar}</div> : null}
      {caption ? <p className="owner-table-caption">{caption}</p> : null}
      <TableContainer className="owner-table-scroll">
        <Table aria-label={label} className="mst-table owner-table" size="small" stickyHeader>
          <Head columns={columns} groups={groups} linked={Boolean(rowTo)} onSort={onSort} sort={sort} />
          <TableBody>{body}</TableBody>
        </Table>
      </TableContainer>
      <Paging onPage={onPage} page={page} />
    </section>
  );
}
