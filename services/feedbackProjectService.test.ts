import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabase = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase }));

import {
  addFeedbackToProject,
  createProject,
  deleteProject,
  fetchAllFeedbackProjectMappings,
  fetchAllFeedbackSimple,
  fetchAllProjects,
  fetchFeedbackNotInProject,
  fetchProject,
  fetchProjectFeedback,
  fetchProjects,
  fetchProjectsForFeedback,
  moveProjectToStatus,
  removeFeedbackFromProject,
  reorderProjectsInColumn,
  updateProject,
} from './feedbackProjectService';

function mockFromQueues(queues: Record<string, any[]>) {
  supabase.from.mockImplementation((table: string) => {
    const queue = queues[table];
    if (!queue || queue.length === 0) {
      throw new Error(`Unhandled table call: ${table}`);
    }
    return queue.shift();
  });
}

describe('feedbackProjectService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Transform + fetch', () => {
    it('fetchProjects orders by sort_order and computes feedbackCount', async () => {
      const order = vi.fn(async () => ({
        data: [
          {
            id: 'p1',
            title: 'One',
            description: 'desc',
            status: 'backlog',
            sort_order: 0,
            github_repo: null,
            github_url: null,
            created_at: '2026-01-01',
            updated_at: '2026-01-02',
          },
          {
            id: 'p2',
            title: 'Two',
            description: null,
            status: 'in_progress',
            sort_order: 1,
            github_repo: 'repo',
            github_url: 'url',
            created_at: '2026-01-03',
            updated_at: '2026-01-04',
          },
        ],
        error: null,
      }));

      const inFn = vi.fn(async () => ({
        data: [{ project_id: 'p1' }, { project_id: 'p1' }, { project_id: 'p2' }],
        error: null,
      }));

      mockFromQueues({
        feedback_projects: [{ select: vi.fn(() => ({ order })) }],
        feedback_project_items: [{ select: vi.fn(() => ({ in: inFn })) }],
      });

      const result = await fetchProjects();

      expect(order).toHaveBeenCalledWith('sort_order', { ascending: true });
      expect(inFn).toHaveBeenCalledWith('project_id', ['p1', 'p2']);
      expect(result).toEqual([
        expect.objectContaining({ id: 'p1', sortOrder: 0, feedbackCount: 2 }),
        expect.objectContaining({ id: 'p2', sortOrder: 1, feedbackCount: 1 }),
      ]);
    });

    it('fetchProject returns transformed project', async () => {
      const single = vi.fn(async () => ({
        data: {
          id: 'p1',
          title: 'Project',
          description: 'desc',
          status: 'backlog',
          sort_order: 4,
          github_repo: 'org/repo',
          github_url: 'https://github.com/org/repo',
          created_at: '2026-01-01',
          updated_at: '2026-01-02',
        },
        error: null,
      }));

      mockFromQueues({
        feedback_projects: [{ select: vi.fn(() => ({ eq: vi.fn(() => ({ single })) })) }],
      });

      const result = await fetchProject('p1');

      expect(result).toEqual({
        id: 'p1',
        title: 'Project',
        description: 'desc',
        status: 'backlog',
        sortOrder: 4,
        githubRepo: 'org/repo',
        githubUrl: 'https://github.com/org/repo',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-02',
      });
    });

    it('fetchProject returns null on error or missing row', async () => {
      const eqError = vi.fn(() => ({
        single: vi.fn(async () => ({ data: null, error: new Error('db') })),
      }));
      const eqMissing = vi.fn(() => ({ single: vi.fn(async () => ({ data: null, error: null })) }));

      mockFromQueues({
        feedback_projects: [
          { select: vi.fn(() => ({ eq: eqError })) },
          { select: vi.fn(() => ({ eq: eqMissing })) },
        ],
      });

      await expect(fetchProject('p1')).resolves.toBeNull();
      await expect(fetchProject('p2')).resolves.toBeNull();
    });
  });

  describe('Create/update/delete/move/reorder', () => {
    it('createProject computes next backlog sort_order and sets optional GitHub fields to null when absent', async () => {
      const insert = vi.fn((payload: any) => {
        expect(payload.github_repo).toBeNull();
        expect(payload.github_url).toBeNull();
        expect(payload.sort_order).toBe(6);
        return {
          select: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: {
                id: 'new1',
                ...payload,
                created_at: '2026-02-01',
                updated_at: '2026-02-01',
              },
              error: null,
            })),
          })),
        };
      });

      mockFromQueues({
        feedback_projects: [
          {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(async () => ({ data: [{ sort_order: 5 }], error: null })),
                })),
              })),
            })),
          },
          { insert },
        ],
      });

      const result = await createProject({ title: 'New Project' });

      expect(result).toEqual(
        expect.objectContaining({ id: 'new1', sortOrder: 6, feedbackCount: 0 })
      );
    });

    it('updateProject only sends provided fields in update payload', async () => {
      const update = vi.fn((payload: any) => {
        expect(payload).toEqual({ title: 'Updated', github_repo: 'org/repo' });
        return { eq: vi.fn(async () => ({ error: null })) };
      });

      mockFromQueues({
        feedback_projects: [{ update }],
      });

      const result = await updateProject('p1', { title: 'Updated', githubRepo: 'org/repo' });
      expect(result).toBe(true);
    });

    it('deleteProject soft-archives (archived_at) and returns false on error, true on success', async () => {
      const updateErr = vi.fn((payload: any) => {
        expect(payload.archived_at).toBeTruthy();
        return { eq: vi.fn(async () => ({ error: new Error('bad') })) };
      });
      const updateOk = vi.fn((payload: any) => {
        expect(payload.archived_at).toBeTruthy();
        return { eq: vi.fn(async () => ({ error: null })) };
      });

      mockFromQueues({
        feedback_projects: [{ update: updateErr }, { update: updateOk }],
      });

      await expect(deleteProject('p1')).resolves.toBe(false);
      await expect(deleteProject('p1')).resolves.toBe(true);
    });

    it('moveProjectToStatus updates status and sort_order', async () => {
      const update = vi.fn((payload: any) => {
        expect(payload).toEqual({ status: 'done', sort_order: 3 });
        return { eq: vi.fn(async () => ({ error: null })) };
      });

      mockFromQueues({
        feedback_projects: [{ update }],
      });

      const result = await moveProjectToStatus('p1', 'done' as any, 3);
      expect(result).toBe(true);
    });

    it('reorderProjectsInColumn issues one update per id and returns false if any update errors', async () => {
      const eqStatus1 = vi.fn(async () => ({ error: null }));
      const eqStatus2 = vi.fn(async () => ({ error: new Error('failed') }));
      const update = vi
        .fn()
        .mockImplementationOnce((payload: any) => {
          expect(payload).toEqual({ sort_order: 0 });
          return { eq: vi.fn(() => ({ eq: eqStatus1 })) };
        })
        .mockImplementationOnce((payload: any) => {
          expect(payload).toEqual({ sort_order: 1 });
          return { eq: vi.fn(() => ({ eq: eqStatus2 })) };
        });

      mockFromQueues({
        feedback_projects: [{ update }, { update }],
      });

      const result = await reorderProjectsInColumn('backlog' as any, ['p1', 'p2']);

      expect(update).toHaveBeenCalledTimes(2);
      expect(result).toBe(false);
    });
  });

  describe('Feedback linkage APIs', () => {
    it('fetchProjectFeedback maps joined user_feedback and handles missing join objects', async () => {
      mockFromQueues({
        feedback_project_items: [
          {
            select: vi.fn(() => ({
              eq: vi.fn(async () => ({
                data: [
                  {
                    id: 'i1',
                    project_id: 'p1',
                    feedback_id: 'f1',
                    created_at: '2026-01-01',
                    user_feedback: {
                      id: 'f1',
                      title: 'Feedback',
                      description: 'd',
                      type: 'feature',
                      importance: 4,
                      status: 'open',
                    },
                  },
                  {
                    id: 'i2',
                    project_id: 'p1',
                    feedback_id: 'f2',
                    created_at: '2026-01-02',
                    user_feedback: null,
                  },
                ],
                error: null,
              })),
            })),
          },
        ],
      });

      const result = await fetchProjectFeedback('p1');
      expect(result[0].feedback?.title).toBe('Feedback');
      expect(result[1].feedback).toBeUndefined();
    });

    it('addFeedbackToProject and removeFeedbackFromProject return success/error properly', async () => {
      mockFromQueues({
        feedback_project_items: [
          { insert: vi.fn(async () => ({ error: null })) },
          { insert: vi.fn(async () => ({ error: new Error('bad') })) },
          {
            delete: vi.fn(() => ({
              eq: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
            })),
          },
          {
            delete: vi.fn(() => ({
              eq: vi.fn(() => ({ eq: vi.fn(async () => ({ error: new Error('bad') })) })),
            })),
          },
        ],
      });

      await expect(addFeedbackToProject('p1', 'f1')).resolves.toBe(true);
      await expect(addFeedbackToProject('p1', 'f1')).resolves.toBe(false);
      await expect(removeFeedbackFromProject('p1', 'f1')).resolves.toBe(true);
      await expect(removeFeedbackFromProject('p1', 'f1')).resolves.toBe(false);
    });

    it('fetchFeedbackNotInProject filters out already-linked feedback IDs', async () => {
      mockFromQueues({
        feedback_project_items: [
          {
            select: vi.fn(() => ({
              eq: vi.fn(async () => ({ data: [{ feedback_id: 'f1' }], error: null })),
            })),
          },
        ],
        user_feedback: [
          {
            select: vi.fn(() => ({
              order: vi.fn(async () => ({
                data: [
                  { id: 'f1', title: 'Already linked' },
                  { id: 'f2', title: 'Available' },
                ],
                error: null,
              })),
            })),
          },
        ],
      });

      const result = await fetchFeedbackNotInProject('p1');
      expect(result).toEqual([{ id: 'f2', title: 'Available' }]);
    });

    it('fetchAllFeedbackSimple returns typed simple list or [] on error', async () => {
      mockFromQueues({
        user_feedback: [
          {
            select: vi.fn(() => ({
              order: vi.fn(async () => ({
                data: [
                  {
                    id: 'f1',
                    title: 't',
                    description: null,
                    type: 'bug',
                    importance: 2,
                    status: 'open',
                  },
                ],
                error: null,
              })),
            })),
          },
          {
            select: vi.fn(() => ({
              order: vi.fn(async () => ({ data: null, error: new Error('db') })),
            })),
          },
        ],
      });

      await expect(fetchAllFeedbackSimple()).resolves.toEqual([
        { id: 'f1', title: 't', description: null, type: 'bug', importance: 2, status: 'open' },
      ]);
      await expect(fetchAllFeedbackSimple()).resolves.toEqual([]);
    });

    it('fetchProjectsForFeedback maps nested feedback_projects join', async () => {
      mockFromQueues({
        feedback_project_items: [
          {
            select: vi.fn(() => ({
              eq: vi.fn(async () => ({
                data: [
                  {
                    project_id: 'p1',
                    feedback_projects: { id: 'p1', title: 'Project One', status: 'backlog' },
                  },
                  { project_id: 'p2', feedback_projects: null },
                ],
                error: null,
              })),
            })),
          },
        ],
      });

      const result = await fetchProjectsForFeedback('f1');
      expect(result).toEqual([{ id: 'p1', title: 'Project One', status: 'backlog' }]);
    });

    it('fetchAllProjects sorts by title', async () => {
      const order = vi.fn(async () => ({
        data: [{ id: 'p1', title: 'A', status: 'backlog' }],
        error: null,
      }));

      mockFromQueues({
        feedback_projects: [{ select: vi.fn(() => ({ order })) }],
      });

      const result = await fetchAllProjects();

      expect(order).toHaveBeenCalledWith('title', { ascending: true });
      expect(result).toEqual([{ id: 'p1', title: 'A', status: 'backlog' }]);
    });

    it('fetchAllFeedbackProjectMappings maps relationship rows into FeedbackProjectMapping', async () => {
      mockFromQueues({
        feedback_project_items: [
          {
            select: vi.fn(async () => ({
              data: [
                {
                  feedback_id: 'f1',
                  project_id: 'p1',
                  feedback_projects: { id: 'p1', title: 'Project', status: 'done' },
                },
                {
                  feedback_id: 'f2',
                  project_id: 'p2',
                  feedback_projects: null,
                },
              ],
              error: null,
            })),
          },
        ],
      });

      const result = await fetchAllFeedbackProjectMappings();
      expect(result).toEqual([
        {
          feedbackId: 'f1',
          projectId: 'p1',
          projectTitle: 'Project',
          projectStatus: 'done',
        },
      ]);
    });
  });
});
