import { describe, expect, it } from 'vitest';

import {
  markdownContentClass,
  sidebarSectionClass,
  sidebarSectionHeaderClass,
  treeRowClass,
} from './ui-classes';

describe('markdownContentClass', () => {
  it('restores list markers for markdown unordered and ordered lists', () => {
    expect(markdownContentClass).toContain('[&_ul]:list-disc');
    expect(markdownContentClass).toContain('[&_ol]:list-decimal');
  });

  it('keeps gfm task lists marker-free to avoid duplicate bullets', () => {
    expect(markdownContentClass).toContain('[&_ul.contains-task-list]:list-none');
    expect(markdownContentClass).toContain('[&_li.task-list-item]:list-none');
  });

  it('keeps sidebar folder list density compact', () => {
    expect(sidebarSectionClass).toContain('gap-[0.1rem]');
    expect(sidebarSectionHeaderClass).toContain('min-h-[1.65rem]');
    expect(sidebarSectionHeaderClass).toContain('py-[0.22rem]');
    expect(treeRowClass).toContain('min-h-[1.62rem]');
    expect(treeRowClass).toContain('py-[0.18rem]');
  });
});
