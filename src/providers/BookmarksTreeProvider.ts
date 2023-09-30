import * as vscode from 'vscode';
import { MarkdownString } from 'vscode';

import { BookmarksController } from '../controllers/BookmarksController';
import { BookmarkMeta, BookmarkStoreType } from '../types';
import gutters from '../gutter';

export class BookmarksTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    contextValue: string,
    public meta: BookmarkStoreType | BookmarkMeta
  ) {
    super(label, collapsibleState);
    this.contextValue = contextValue;
    if ('color' in this.meta) {
      this.iconPath = gutters[this.meta.color] || gutters['default'];
    }
    this._createTooltip();
  }

  private _createTooltip() {
    if ('color' in this.meta) {
      const appendMarkdown = (
        bookmark: BookmarkMeta,
        markdownString: MarkdownString
      ) => {
        if (bookmark.label) {
          markdownString.appendMarkdown(`#### ${bookmark.label}`);
        }
        if (bookmark.description) {
          markdownString.appendMarkdown(`\n ${bookmark.description}`);
        }
      };

      const {
        rangesOrOptions: { hoverMessage: _hoverMessage },
      } = this.meta;
      let markdownString = _hoverMessage || new MarkdownString('', true);
      if (markdownString instanceof MarkdownString) {
        appendMarkdown(this.meta, markdownString);
      } else if (!Object.keys(markdownString).length) {
        markdownString = new MarkdownString('', true);
        appendMarkdown(this.meta, markdownString);
      }
      this.tooltip = markdownString as MarkdownString;
    }
  }
}

export class BookmarksTreeProvider
  implements vscode.TreeDataProvider<BookmarksTreeItem>
{
  private _onDidChangeEvent = new vscode.EventEmitter<BookmarksTreeItem>();
  private _controller: BookmarksController;

  get datasource() {
    return this._controller.datasource;
  }

  onDidChangeTreeData?:
    | vscode.Event<
        void | BookmarksTreeItem | BookmarksTreeItem[] | null | undefined
      >
    | undefined = this._onDidChangeEvent.event;

  constructor(controller: BookmarksController) {
    this._controller = controller;
    this._controller.updateChangeEvent(this._onDidChangeEvent);
  }

  getTreeItem(
    element: BookmarksTreeItem
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }
  getChildren(
    element?: BookmarksTreeItem | undefined
  ): vscode.ProviderResult<BookmarksTreeItem[]> {
    if (!element) {
      const bookmarkRootStoreArr = this.datasource?.data || [];
      const children = bookmarkRootStoreArr.map(
        (it) =>
          new BookmarksTreeItem(
            it.filename,
            vscode.TreeItemCollapsibleState.Collapsed,
            'file',
            it
          )
      );
      return Promise.resolve(children);
    }
    let children: BookmarksTreeItem[] = [];
    try {
      children = (element.meta as BookmarkStoreType).bookmarks.map((it) => {
        const selection = new vscode.Selection(
          it.selection.anchor,
          it.selection.active
        );

        return new BookmarksTreeItem(
          it.label || it.id,
          vscode.TreeItemCollapsibleState.None,
          'item',
          {
            ...it,
            selection,
          }
        );
      });
      return Promise.resolve(children);
    } catch (error) {
      return Promise.resolve([]);
    }
  }
}
