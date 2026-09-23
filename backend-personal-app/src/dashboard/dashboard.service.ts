import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface DashboardResponse {
  projects: {
    total: number;
    byStatus: Record<string, number>;
  };
  tasks: {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
  };
  knowledge: {
    total: number;
  };
  snippets: {
    total: number;
    byLanguage: Record<string, number>;
  };
  tags: {
    total: number;
  };
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string): Promise<DashboardResponse> {
    const memberships = await this.prisma.client.orm.public.ProjectMember
      .where({ userId })
      .select('projectId')
      .all();

    const projectIds = memberships.map((item) => item.projectId);

    const projectIdSet = new Set(projectIds);

    const allProjects = await this.prisma.client.orm.public.Project
      .select('id', 'status')
      .all();

    const projects = allProjects.filter((project) =>
      projectIdSet.has(project.id),
    );

    const allTasks = await this.prisma.client.orm.public.Task
      .select('projectId', 'status', 'priority')
      .all();

    const tasks = allTasks.filter((task) =>
      projectIdSet.has(task.projectId),
    );

    const knowledge = await this.prisma.client.orm.public.KnowledgeArticle
      .where({ createdBy: userId })
      .select('id')
      .all();

    const snippets = await this.prisma.client.orm.public.CodeSnippet
      .where({ createdBy: userId })
      .select('id', 'language')
      .all();

    const tags = await this.prisma.client.orm.public.Tag
      .select('id')
      .all();

    const byStatus: Record<string, number> = {};
    for (const project of projects) {
      byStatus[project.status] = (byStatus[project.status] ?? 0) + 1;
    }

    const taskByStatus: Record<string, number> = {};
    const taskByPriority: Record<string, number> = {};
    for (const task of tasks) {
      taskByStatus[task.status] = (taskByStatus[task.status] ?? 0) + 1;
      taskByPriority[task.priority] = (taskByPriority[task.priority] ?? 0) + 1;
    }

    const byLanguage: Record<string, number> = {};
    for (const snippet of snippets) {
      const language = snippet.language.trim() || 'unknown';
      byLanguage[language] = (byLanguage[language] ?? 0) + 1;
    }

    return {
      projects: {
        total: projects.length,
        byStatus,
      },
      tasks: {
        total: tasks.length,
        byStatus: taskByStatus,
        byPriority: taskByPriority,
      },
      knowledge: {
        total: knowledge.length,
      },
      snippets: {
        total: snippets.length,
        byLanguage,
      },
      tags: {
        total: tags.length,
      },
    };
  }
}
