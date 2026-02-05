"use client";

import Link from "next/link";
import { Project } from "@/lib/types";
import { getAllTasks, getCompletionPercent, getTaskStats, getTotalPhases } from "@/lib/utils";
import TypeBadge from "./TypeBadge";
import ProgressBar from "./ProgressBar";

interface ProjectCardProps {
  project: Project;
  index: number;
}

export default function ProjectCard({ project, index }: ProjectCardProps) {
  const tasks = getAllTasks(project);
  const percent = getCompletionPercent(tasks);
  const stats = getTaskStats(tasks);
  const totalPhases = getTotalPhases(project);

  return (
    <Link href={`/project/${project.slug || project._id}`}>
      <div
        className="
          bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 
          hover:bg-slate-800/80 hover:border-slate-600/50 
          active:scale-[0.98] transition-all duration-200 cursor-pointer
          animate-fade-in
        "
        style={{ animationDelay: `${index * 0.08}s` }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-100 truncate">{project.name}</h3>
            <p className="text-sm text-slate-400 mt-0.5 line-clamp-2">{project.description}</p>
          </div>
          <TypeBadge type={project.type} />
        </div>

        {/* Tech Stack Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {project.techStack.slice(0, 4).map((tech) => (
            <span
              key={tech}
              className="text-[11px] px-2 py-0.5 rounded-md bg-slate-700/60 text-slate-300 font-medium"
            >
              {tech}
            </span>
          ))}
          {project.techStack.length > 4 && (
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-700/60 text-slate-400">
              +{project.techStack.length - 4}
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-slate-400">Progress</span>
            <span className="text-xs font-semibold text-slate-300">{percent}%</span>
          </div>
          <ProgressBar value={percent} size="md" />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <span className="text-slate-500">📂</span>
            <span>{project.components.length} components</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">📋</span>
            <span>{totalPhases} phases</span>
          </div>
          <div className="flex items-center gap-1">
            <span>✅</span>
            <span className="text-emerald-400 font-medium">{stats.done}</span>
            <span>/</span>
            <span>{stats.total} tasks</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
