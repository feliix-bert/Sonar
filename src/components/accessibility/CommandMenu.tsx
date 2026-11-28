"use client";

import React from "react";
import { BookOpen, FileText } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CommandMenuTrigger } from "./CommandMenuTrigger";
import { useCommandMenu } from "./use-command-menu";
import { COMMAND_ROUTES } from "./command-menu.constants";
import type { CommandMenuProps } from "./command-menu.types";

export { COMMAND_ROUTES } from "./command-menu.constants";
export { useCommandMenu } from "./use-command-menu";
export type {
  CommandMenuProps,
  CommandRouteItem,
  SearchCourse,
  SearchDocument,
} from "./command-menu.types";

/**
 * CommandMenu
 * Global search & command palette accessible dialog.
 * Separates data constants, reactive logic (useCommandMenu), and UI presentation.
 */
export function CommandMenu({
  compact = false,
  bar = false,
}: CommandMenuProps) {
  const { open, setOpen, courses, documents, handleNavigate } = useCommandMenu();

  return (
    <>
      <CommandMenuTrigger
        onOpen={() => setOpen(true)}
        bar={bar}
        compact={compact}
      />

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Pencarian Halaman &amp; Materi SONAR"
        description="Cari halaman fitur, materi kuliah, atau mata kuliah terdaftar."
      >
        <CommandInput placeholder="Cari halaman, materi kuliah, atau fitur..." />
        <CommandList>
          <CommandEmpty>Tidak ada hasil yang cocok.</CommandEmpty>

          {/* Group 1: Halaman & Fitur Navigasi */}
          <CommandGroup heading="Halaman &amp; Fitur">
            {COMMAND_ROUTES.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.href}
                  value={`${item.label} ${item.href} ${item.keywords}`}
                  onSelect={() => handleNavigate(item.href)}
                >
                  <Icon className="mr-2 size-4 text-primary" aria-hidden="true" />
                  <span>{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>

          {/* Group 2: Materi & Dokumen Kuliah */}
          {documents.length > 0 && (
            <CommandGroup heading="Materi &amp; Dokumen Kuliah">
              {documents.map((doc) => (
                <CommandItem
                  key={`doc-${doc.id}`}
                  value={`${doc.title} ${doc.courseId} materi dokumen bacaan`}
                  onSelect={() => handleNavigate(`/reader?id=${doc.id}`)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="truncate">{doc.title}</span>
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground shrink-0 uppercase tracking-wider ml-2">
                    {doc.status === "verified" ? "Terverifikasi" : "Draft AI"}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Group 3: Mata Kuliah */}
          {courses.length > 0 && (
            <CommandGroup heading="Mata Kuliah">
              {courses.map((course) => (
                <CommandItem
                  key={`course-${course.id}`}
                  value={`${course.code} ${course.title} ${course.discipline} kuliah`}
                  onSelect={() => handleNavigate(`/courses`)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 truncate">
                    <BookOpen className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="font-semibold text-foreground">{course.code}</span>
                    <span className="truncate text-muted-foreground">: {course.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {course.discipline}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
