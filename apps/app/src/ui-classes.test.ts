import { describe, expect, it } from 'vitest';

import { markdownContentClass } from './ui-classes';

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
