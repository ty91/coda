import type { ProjectId, ProjectSummary } from '@coda/core/contracts';
import { FolderKanban } from 'lucide-react';
import type { ReactElement } from 'react';

import { eyebrowClass, sidebarMessageTextClass, sidebarSurfaceClass } from '../ui-classes';

type ProjectsSidebarProps = {
  panelId: string;
  projects: ProjectSummary[];
  activeProjectId: ProjectId | null;
  loading: boolean;
  error: string | null;
  isOpen: boolean;
  onSelectProject: (projectId: ProjectId) => void;
};

export const ProjectsSidebar = ({
  panelId,
  projects,
  activeProjectId,
  loading,
  error,
  isOpen,
  onSelectProject,
}: ProjectsSidebarProps): ReactElement | null => {
  if (!isOpen) {
    return null;
  }

  return (
    <aside
      id={panelId}
      className={`${sidebarSurfaceClass} relative grid h-full min-h-0 content-start gap-3 overflow-y-auto px-0 pb-3 pt-11`}
      aria-label="Projects sidebar"
      data-testid="projects-sidebar"
    >
      <div
        className="absolute inset-x-0 top-0 h-11"
        data-tauri-drag-region
        data-testid="projects-sidebar-drag-region"
        aria-hidden
      />
      <header className="grid gap-[0.15rem] px-1">
        <p className={eyebrowClass}>Projects</p>
      </header>

      {loading ? <p className={sidebarMessageTextClass}>Loading registered projects...</p> : null}
      {error ? <p className="text-[0.8125rem] font-normal text-coda-error">{error}</p> : null}

      {!loading && !error && projects.length === 0 ? (
        <p className={sidebarMessageTextClass}>No registered projects.</p>
      ) : null}

      {!loading && !error && projects.length > 0 ? (
        <nav className="grid content-start gap-[0.2rem] px-[0.08rem]" aria-label="Project navigation">
          {projects.map((project) => {
            const isActive = project.projectId === activeProjectId;
            const buttonClass = isActive
              ? 'flex min-h-[1.8rem] w-full items-center gap-2 rounded-[0.55rem] bg-[var(--color-coda-sidebar-row-hover)] px-[0.68rem] py-[0.24rem] text-left text-[0.8125rem] font-medium text-[var(--color-coda-sidebar-text)]'
              : 'flex min-h-[1.8rem] w-full items-center gap-2 rounded-[0.55rem] px-[0.68rem] py-[0.24rem] text-left text-[0.8125rem] font-normal text-[var(--color-coda-sidebar-text)] transition-colors hover:bg-[var(--color-coda-sidebar-row-hover)]';

            return (
              <button
                key={project.projectId}
                type="button"
                className={buttonClass}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onSelectProject(project.projectId)}
              >
                <FolderKanban size={13} strokeWidth={2} aria-hidden />
                <span className="truncate">{project.displayName}</span>
              </button>
            );
          })}
        </nav>
      ) : null}
    </aside>
  );
};
