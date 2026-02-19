import { describe, expect, it } from 'vitest';

import {
  markdownContentClass,
  sidebarIconButtonClass,
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
});

describe('interactive sidebar classes', () => {
  it('shows pointer cursor on clickable controls', () => {
    expect(sidebarIconButtonClass).toContain('cursor-pointer');
    expect(sidebarSectionHeaderClass).toContain('cursor-pointer');
    expect(treeRowClass).toContain('cursor-pointer');
  });
});
