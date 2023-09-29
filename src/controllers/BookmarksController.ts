import * as vscode from 'vscode';
import { createHash } from '../utils/hash';
import { EXTENSION_ID } from '../constants';
import { BookmarkMeta, BookmarkStoreRootType } from '../types';
import { createID } from '../utils';

export class BookmarksController {
  private static _instance: BookmarksController;
  private _datasource: BookmarkStoreRootType | undefined;
  private _context: vscode.ExtensionContext;

  private _onDidChangeEvent:
    | vscode.EventEmitter<any | undefined | void>
    | undefined;
  public get datasource(): BookmarkStoreRootType | undefined {
    return this._datasource;
  }

  public get workspaceState(): vscode.Memento {
    return this._context.workspaceState;
  }

  private constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this._datasource =
      this.workspaceState.get<BookmarkStoreRootType>(EXTENSION_ID);
    if (!this._datasource) {
      this.save({
        workspace: createHash(context.storageUri?.toString()) || '',
        data: [],
      });
    }
  }

  updateChangeEvent(event: vscode.EventEmitter<any | undefined | void>) {
    this._onDidChangeEvent = event;
  }

  add(editor: vscode.TextEditor, bookmark: Partial<Omit<BookmarkMeta, 'id'>>) {
    const fileUri = editor.document.uri;
    const fileHash = createHash(fileUri.toString());
    if (fileHash) {
      const idx = this._datasource!.data.findIndex((it) => it.id === fileHash);
      let bookmarkStore;
      if (idx === -1) {
        bookmarkStore = {
          id: fileHash,
          fileUri,
          filename: editor.document.fileName,
          bookmarks: [] as BookmarkMeta[],
        };
        this._datasource?.data.push(bookmarkStore);
      } else {
        bookmarkStore = this._datasource!.data[idx];
      }
      // @ts-ignore
      bookmarkStore.bookmarks.push({
        ...bookmark,
        id: createID(),
        fileUri: fileUri,
        fileUriHash: fileHash,
      });
      this.save();
    }
  }
  remove(bookmark: BookmarkMeta) {
    let idx = this._datasource!.data.findIndex(
      (it) => it.id === bookmark.fileUriHash
    );
    if (idx === -1) {
      return;
    }
    idx = this._datasource!.data[idx].bookmarks.findIndex(
      (it) => it.id === bookmark.id
    );
    if (idx === -1) {
      return;
    }
    this.datasource!.data[idx].bookmarks.splice(idx, 1);
    this.save();
  }
  update(
    bookmark: BookmarkMeta,
    bookmarkDto: Partial<Omit<BookmarkMeta, 'id'>>
  ) {
    if (!bookmark.fileUriHash) {
      return;
    }

    let idx = this._datasource!.data.findIndex(
      (it) => it.id === bookmark.fileUriHash
    );
    if (idx === -1) {
      return;
    }
    const bookmarkIdx = this._datasource!.data[idx].bookmarks.findIndex(
      (it) => it.id === bookmark.id
    );
    if (bookmarkIdx === -1) {
      return;
    }
    const existed = this._datasource!.data[idx].bookmarks[bookmarkIdx];
    const { rangesOrOptions, ...rest } = bookmarkDto;
    this._datasource!.data[idx].bookmarks[bookmarkIdx] = {
      ...existed,
      ...rest,
      rangesOrOptions: {
        ...(existed.rangesOrOptions || {}),
        ...rangesOrOptions,
      },
    } as BookmarkMeta;
    this.save();
  }
  detail(bookmark: BookmarkMeta) {
    const { id, fileUriHash } = bookmark;
    if (!fileUriHash) {
      return;
    }

    let idx = this._datasource!.data.findIndex((it) => it.id === fileUriHash);
    if (idx === -1) {
      return;
    }
    return this._datasource!.data[idx].bookmarks.find((it) => it.id === id);
  }

  getBookmarkStoreByFileUri(fileUri: vscode.Uri) {
    const hash = createHash(fileUri.toString());
    if (!hash) return;
    const idx = this._datasource!.data.findIndex((it) => it.id === hash);
    if (idx === -1) {
      return;
    }
    return this._datasource!.data[idx];
  }

  restore() {
    this.save({
      workspace: createHash(this._context.storageUri?.toString()) || '',
      data: [],
    });
  }

  clearAll(fileUri?: vscode.Uri) {
    if (!this._datasource?.data.length) {
      return;
    }
    this.restore();
  }

  save(store?: BookmarkStoreRootType) {
    this._datasource = store || this._datasource;
    this.workspaceState.update(EXTENSION_ID, this._datasource).then();
    this._fire();
  }
  /**
   *
   * @param bookmark
   * @param label
   */
  editLabel(bookmark: BookmarkMeta, label: string) {
    this.update(bookmark, { label });
  }

  refresh() {
    this._fire();
  }

  _fire() {
    // @ts-ignore
    this._onDidChangeEvent?.fire();
  }

  static getInstance(context: vscode.ExtensionContext): BookmarksController {
    if (!BookmarksController._instance) {
      BookmarksController._instance = new BookmarksController(context);
    }
    return BookmarksController._instance;
  }

  static get instance(): BookmarksController {
    return BookmarksController._instance;
  }
}