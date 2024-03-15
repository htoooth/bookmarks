import {Instance, types} from 'mobx-state-tree';
import {DEFAULT_BOOKMARK_COLOR} from '../constants';
import {
  DecorationOptions,
  Range,
  Selection,
  Uri,
  WorkspaceFolder,
  workspace,
} from 'vscode';
import {
  createHoverMessage,
  generateUUID,
  sortBookmarksByLineNumber,
} from '../utils';
import {BookmarkColor, BookmarkStoreType} from '../types';

type SortedType = {
  /**
   * 表示文件/工作区间的排序索引
   */
  sortedIndex?: number;
  /**
   * 当按照文件/工作区分组的时, 书签的顺序索引
   */
  bookmarkSortedIndex?: number;
};

type MyUri = {
  /**
   * 文件的相对路径
   */
  fsPath: string;
} & SortedType;

type MyWorkspaceFolder = {
  /**
   * 公共文件夹名称
   */
  name: string;

  /**
   * workspace index
   */
  index: number;
} & SortedType;

type MyColor = {
  name: string;
} & SortedType;

type MyTag = SortedType & {
  name: string;
};

export type GroupedByFileType = BookmarkStoreType & {
  sortedIndex?: number;
};

export type GroupedByColorType = {
  color: BookmarkColor;
  bookmarks: IBookmark[];
  sortedIndex?: number;
};

export type GroupedByWorkspaceType = {
  workspace: Partial<WorkspaceFolder> & SortedType;
  files: BookmarkStoreType[];
};
const TagType = types.custom<MyTag, MyTag>({
  name: 'MyTag',
  fromSnapshot(snapshot, env) {
    return snapshot;
  },
  toSnapshot(value: MyTag) {
    return value;
  },
  isTargetType(value: MyTag | any): boolean {
    return true;
  },
  getValidationMessage(value: MyTag): string {
    return '';
  },
});

const MyUriType = types.custom<MyUri, MyUri>({
  name: 'MyUri',
  fromSnapshot(snapshot, env) {
    return snapshot;
  },
  toSnapshot(value: Uri) {
    return value;
  },
  isTargetType(value: Uri | any): boolean {
    return true;
  },
  getValidationMessage(value: Uri): string {
    return '';
  },
});

export type IMyUriType = Instance<typeof MyUriType>;

const MyWorkspaceFolderType = types.custom<
  MyWorkspaceFolder,
  MyWorkspaceFolder
>({
  name: 'MyWorkspaceFolder',
  fromSnapshot(snapshot, env) {
    return snapshot;
  },
  toSnapshot(value) {
    return value;
  },
  isTargetType(value) {
    return true;
  },
  getValidationMessage(snapshot) {
    return '';
  },
});

export type IMyWorkspaceFolderType = Instance<typeof MyWorkspaceFolderType>;

const RangType = types.custom<Range, Range>({
  name: 'RangeType',
  fromSnapshot(snapshot, env) {
    return snapshot;
  },
  toSnapshot(value) {
    return value;
  },
  isTargetType(value) {
    return true;
  },
  getValidationMessage(snapshot) {
    if (!snapshot) {return 'Invalid rangesOrOptions';}
    return '';
  },
});

export type IRangeType = Instance<typeof RangType>;

const DecorationOptionsType = types.custom<
  DecorationOptions,
  DecorationOptions
>({
  name: 'DecorationOptions',
  fromSnapshot(snapshot, env) {
    return snapshot;
  },
  toSnapshot(value) {
    return value;
  },
  isTargetType(value) {
    return true;
  },
  getValidationMessage(snapshot) {
    return '';
  },
});
export type IDecorationOptionsType = Instance<typeof DecorationOptionsType>;

const MyColorType = types.custom<MyColor, MyColor>({
  name: 'MyColor',
  fromSnapshot(snapshot, env) {
    return snapshot;
  },
  toSnapshot(value) {
    return value;
  },
  isTargetType(value) {
    return true;
  },
  getValidationMessage(snapshot) {
    return '';
  },
});

export type IMyColorType = Instance<typeof MyColorType>;

const MySelectionType = types.custom<Selection, Selection>({
  name: 'Selection',
  fromSnapshot(snapshot, env) {
    return snapshot;
  },
  toSnapshot(value) {
    return value;
  },
  isTargetType(value) {
    return true;
  },
  getValidationMessage(snapshot) {
    return '';
  },
});

export type IMySelectionType = Instance<typeof MySelectionType>;

export const Bookmark = types
  .model('Boomkmark', {
    id: types.string,
    label: types.optional(types.string, ''),
    description: types.optional(types.string, ''),
    customColor: types.optional(MyColorType, {
      name: DEFAULT_BOOKMARK_COLOR,
      sortedIndex: -1,
      bookmarkSortedIndex: -1,
    }),
    fileUri: MyUriType,
    type: types.optional(types.enumeration(['line', 'selection']), 'line'),
    selectionContent: types.optional(types.string, ''),
    languageId: types.optional(types.string, 'javascript'),
    workspaceFolder: MyWorkspaceFolderType,
    rangesOrOptions: DecorationOptionsType,
    createdAt: types.optional(types.Date, () => new Date()),
    tag: types.optional(TagType, {
      name: 'default',
      sortedIndex: -1,
      bookmarkSortedIndex: -1,
    }),
  })
  .views(self => {
    return {
      get fileId() {
        const ws = workspace.workspaceFolders?.find(
          it => it.name === self.workspaceFolder.name,
        );
        if (!ws) {
          return self.fileUri.fsPath;
        }

        return Uri.joinPath(ws.uri, self.fileUri.fsPath).fsPath;
      },
      get fileName() {
        const arr = self.fileUri.fsPath.split('/');
        return arr[arr.length - 1];
      },
      get color() {
        return self.customColor.name;
      },
      get wsFolder() {
        return workspace.workspaceFolders?.find(
          it => it.name === self.workspaceFolder.name,
        );
      },
      get selection() {
        const {start, end} = self.rangesOrOptions.range;
        return new Selection(
          start.line,
          start.character,
          end.line,
          end.character,
        );
      },
    };
  })
  .actions(self => {
    function update(bookmarkDto: Partial<Omit<IBookmark, 'id'>>) {
      Object.keys(bookmarkDto).forEach(it => {
        // @ts-ignore
        if (bookmarkDto[it]) {
          // @ts-ignore
          self[it] = bookmarkDto[it];
        }
      });
    }
    function updateRangesOrOptionsHoverMessage() {
      const rangesOrOptions = {...self.rangesOrOptions};
      rangesOrOptions.hoverMessage = createHoverMessage(
        self as IBookmark,
        true,
        true,
      );
      self.rangesOrOptions = rangesOrOptions;
    }
    function updateLabel(label: string) {
      self.label = label;
      updateRangesOrOptionsHoverMessage();
    }
    function updateDescription(desc: string) {
      self.description = desc;
      updateRangesOrOptionsHoverMessage();
    }

    function updateRangesOrOptions(rangesOrOptions: IDecorationOptionsType) {
      self.rangesOrOptions = rangesOrOptions;
      updateRangesOrOptionsHoverMessage();
    }

    function updateColor(newColor: IMyColorType) {
      self.customColor = newColor;
    }

    function updateSelectionContent(content: string) {
      self.selectionContent = content;
    }

    function updateFileUri(uri: Uri) {
      self.fileUri = {
        fsPath: uri.fsPath,
        sortedIndex: self.fileUri.sortedIndex,
        bookmarkSortedIndex: self.fileUri.bookmarkSortedIndex,
      };
    }

    return {
      update,
      updateLabel,
      updateDescription,
      updateRangesOrOptions,
      updateRangesOrOptionsHoverMessage,
      updateSelectionContent,
      updateFileUri,
      updateColor,
    };
  });

export const BookmarksStore = types
  .model('BookmarksStore', {
    bookmarks: types.optional(types.array(Bookmark), []),
    viewType: types.optional(types.enumeration(['tree', 'list']), 'tree'),
    groupView: types.optional(
      types.enumeration(['file', 'color', 'default', 'workspace']),
      'file',
    ),
    sortedType: types.optional(
      types.enumeration(['linenumber', 'custom', 'time']),
      'linenumber',
    ),
  })
  .views(self => {
    return {
      getBookmarksByFileUri(fileUri: Uri) {
        return self.bookmarks.filter(it => it.fileId === fileUri.fsPath);
      },
      get bookmarksGroupedByFile() {
        if (!self.bookmarks.length) {return [];}
        const grouped: GroupedByFileType[] = [];
        self.bookmarks.forEach(it => {
          const existed = grouped.find(item => item.fileId === it.fileId);
          if (existed) {
            existed.bookmarks.push(it);
          } else {
            grouped.push({
              fileId: it.fileId,
              // @ts-ignore
              fileName: it.fileName || it['filename'],
              fileUri: it.fileUri,
              bookmarks: [it],
            });
          }
        });
        return grouped.map(it => ({
          ...it,
          bookmarks: sortBookmarksByLineNumber(it.bookmarks),
        }));
      },
      get bookmarksGroupedByColor() {
        const grouped: GroupedByColorType[] = [];
        self.bookmarks.forEach(it => {
          const existed = grouped.find(item => item.color === it.color);
          if (!existed) {
            grouped.push({
              color: it.color,
              bookmarks: [it],
            });
            return;
          }
          existed.bookmarks.push(it);
        });
        return grouped.map(it => ({
          ...it,
          bookmarks: sortBookmarksByLineNumber(it.bookmarks),
        }));
      },

      /**
       * {
       *  workspace: MyWorkspaceFolder
       *  files:[
       *    {
       *        fileId: string,
       *        bookmarks: [
       *
       *        ]
       *    }
       *  ]
       *
       * }
       */
      get bookmakrsGroupedByWorkspace() {
        const grouped: GroupedByWorkspaceType[] = [];
        self.bookmarks.forEach(it => {
          const existed = grouped.find(
            item => item.workspace.name === it.workspaceFolder?.name,
          );

          if (!existed) {
            grouped.push({
              workspace: {...it.workspaceFolder, ...it.wsFolder},
              files: [
                {
                  bookmarks: [it],
                  fileId: it.fileId,
                  fileName: it.fileName,
                  fileUri: it.fileUri,
                },
              ],
            });
            return;
          }
          const existedFile = existed.files.find(
            file => file.fileId === it.fileId,
          );
          if (!existedFile) {
            existed.files.push({
              fileId: it.fileId,
              fileName: it.fileName,
              fileUri: it.fileUri,
              bookmarks: [it],
            });
            return;
          }
          existedFile.bookmarks.push(it);
        });
        return grouped.map(it => {
          it.files = it.files.map(file => {
            return {
              ...file,
              bookmarks: sortBookmarksByLineNumber(file.bookmarks),
            };
          });
          return it;
        });
      },
      get totalCount() {
        return self.bookmarks.length;
      },
      get labeledCount() {
        return self.bookmarks.filter(it => it.label.length).length;
      },
      get colors() {
        return self.bookmarks.map(it => it.color || it.customColor.name);
      },
    };
  })
  .actions(self => {
    function createBookmark(bookmark: any) {
      let _bookmark;
      const {
        id,
        label,
        description,
        type,
        selectionContent,
        languageId,
        workspaceFolder,
        rangesOrOptions,
        createdAt,
        fileUri,
      } = bookmark;

      const customColor = bookmark.customColor
        ? bookmark.customColor
        : {
            name: bookmark.color || 'default',
            sortedIndex: -1,
            bookmarkSortedIndex: -1,
          };
      rangesOrOptions.hoverMessage = createHoverMessage(bookmark, true, true);
      _bookmark = Bookmark.create({
        id: id || generateUUID(),
        label,
        description,
        customColor,
        fileUri: {
          sortedIndex: fileUri.sortedIndex || -1,
          bookmarkSortedIndex: fileUri.bookmarkSortedIndex || -1,
          fsPath: workspace.asRelativePath(fileUri.fsPath, false),
        },
        type,
        selectionContent,
        languageId,
        workspaceFolder: {
          sortedIndex: workspaceFolder.sortedIndex || -1,
          bookmarkSortedIndex: workspaceFolder.bookmarkSortedIndex || -1,
          name: workspaceFolder.name,
          index: workspaceFolder.index,
        },
        rangesOrOptions: rangesOrOptions,
        createdAt,
      });
      return _bookmark;
    }
    function add(bookmark: IBookmark) {
      if (self.bookmarks.find(it => it.id === bookmark.id)) {
        return;
      }
      self.bookmarks.push(bookmark);
    }
    return {
      afterCreate() {},
      add,
      addBookmarks(bookmarks: any[]) {
        let _bookmark;
        for (let bookmark of bookmarks) {
          _bookmark = createBookmark(bookmark);
          add(_bookmark);
        }
      },
      createBookmark,
      delete(id: string) {
        const idx = self.bookmarks.findIndex(it => it.id === id);
        if (idx === -1) {return false;}
        self.bookmarks.splice(idx, 1);
        return true;
      },
      update(id: string, dto: Partial<IBookmark>) {
        const bookmark = self.bookmarks.find(it => it.id === id);
        if (!bookmark) {
          return;
        }
        Object.keys(dto).forEach(key => {
          // @ts-ignore
          if (dto[key]) {
            // @ts-ignore
            bookmark[key] = dto[key];
          }
        });
      },
      clearBookmarksByFile(fileUri: Uri) {
        const deleteItems = self.bookmarks.filter(
          it => it.fileId === fileUri.fsPath,
        );
        for (let item of deleteItems) {
          self.bookmarks.remove(item);
        }
      },
      clearByColor(color: string) {},
      clearAll() {
        self.bookmarks.clear();
      },
    };
  });

export type IBookmark = Instance<typeof Bookmark>;

export type IBookmarksStore = Instance<typeof BookmarksStore>;
