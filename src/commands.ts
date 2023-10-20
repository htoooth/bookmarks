import { ExtensionContext, window } from 'vscode';
import { registerCommand } from './utils';
import {
  CMD_TOGGLE_LINE_BOOKMARK,
  CMD_TOGGLE_BOOKMARK_WITH_LABEL,
  CMD_CLEAR_ALL,
  CMD_DELETE_BOOKMARK,
  CMD_EDIT_LABEL,
  CMD_GO_TO_SOURCE_LOCATION,
  CMD_TOGGLE_BOOKMARK_WITH_SECTIONS,
  CMD_BOOKMARK_ADD_MORE_MEMO,
  CMD_JUMP_TO_BOOKMARK,
  CMD_CHANGE_BOOKMARK_COLOR,
} from './constants';

import { updateActiveEditorAllDecorations } from './decorations';
import { LineBookmarkContext } from './types';
import { BookmarksController } from './controllers/BookmarksController';
import {
  checkIfBookmarksIsInCurrentEditor,
  chooseBookmarkColor,
  deleteLineBookmark,
  editBookmarkDescription,
  gotoSourceLocation,
  quicklyJumpToBookmark,
  toggleBookmarksWithSelections,
  toggleBookmark,
  getBookmarkFromCurrentActivedLine,
  editBookmarkLabel,
} from './utils/bookmark';
import { BookmarksTreeItem } from './providers/BookmarksTreeProvider';

/**
 * 注册所需要的命令
 * @param context
 */
export function registerCommands(context: ExtensionContext) {
  // 开启行书签, 使用默认颜色且无标签等相关信息
  registerCommand(
    context,
    CMD_TOGGLE_LINE_BOOKMARK,
    async (args: LineBookmarkContext) => {
      toggleBookmark(args, { type: 'line' });
    }
  );
  // 开启带有标签的行书签
  registerCommand(
    context,
    CMD_TOGGLE_BOOKMARK_WITH_LABEL,
    async (context: LineBookmarkContext) => {
      const label = await window.showInputBox({
        placeHolder: 'Type a label for your bookmarks',
        title:
          'Bookmark Label (Press `Enter` to confirm or press `Escape` to cancel)',
      });
      if (!label) {
        return;
      }
      toggleBookmark(context, {
        label,
        type: 'line',
      });
    }
  );
  // 开启行书签,并可以指定书签颜色
  registerCommand(
    context,
    'toggleLineBookmarkWithColor',
    async (context: LineBookmarkContext) => {
      toggleBookmark(context, {
        withColor: true,
        type: 'line',
      });
    }
  );
  // 清除书签
  registerCommand(context, CMD_CLEAR_ALL, (args) => {
    updateActiveEditorAllDecorations(true);
    let fileUri;
    if (args && args.meta) {
      fileUri = args.meta.fileUri;
      BookmarksController.instance.clearAllBookmarkInFile(fileUri);
      return;
    }
    BookmarksController.instance.clearAll();
  });

  // 删除书签
  registerCommand(
    context,
    CMD_DELETE_BOOKMARK,
    (context: LineBookmarkContext | BookmarksTreeItem) => {
      if (!context) {
        return;
      }
      updateActiveEditorAllDecorations(true);
      // 从treeView中执行此命令
      if ('meta' in context && 'color' in context.meta) {
        BookmarksController.instance.remove(context.meta);
        updateActiveEditorAllDecorations();
        return;
      }
      // 从`decoration`或者`command palette`那边删除调用此命令
      if (!('bookmarks' in context)) {
        deleteLineBookmark(context as LineBookmarkContext);
      }
      updateActiveEditorAllDecorations();
    }
  );
  // 编辑书签标签
  registerCommand(context, CMD_EDIT_LABEL, (args) => {
    window
      .showInputBox({
        placeHolder: 'Type a label for your bookmarks',
        title:
          'Bookmark Label (Press `Enter` to confirm or press `Escape` to cancel)',
      })
      .then((label) => {
        if (!label) {
          return;
        }
        if (args.contextValue === 'item') {
          editBookmarkLabel(args.meta, label);
          return;
        }
        let bookmark = getBookmarkFromCurrentActivedLine();
        if (!bookmark) return;
        editBookmarkLabel(bookmark, label);
      });
  });

  // 定位书签位置,并跳转到书签位置
  registerCommand(context, CMD_GO_TO_SOURCE_LOCATION, (args) => {
    gotoSourceLocation(args.meta);
  });

  // 为选中的区域增加书签
  registerCommand(context, CMD_TOGGLE_BOOKMARK_WITH_SECTIONS, (args) => {
    window
      .showInputBox({
        placeHolder: 'Type a label for your bookmarks',
        title:
          'Bookmark Label (Press `Enter` to confirm or press `Escape` to cancel)',
      })
      .then((label) => {
        if (!label) {
          return;
        }

        toggleBookmarksWithSelections(label);
      });
  });

  // 为书签增加备注信息
  registerCommand(context, CMD_BOOKMARK_ADD_MORE_MEMO, (args) => {
    window
      .showInputBox({
        placeHolder: 'Type more info for your bookmarks',
        title:
          'Bookmark Label (Press `Enter` to confirm or press `Escape` to cancel)',
      })
      .then((description) => {
        if (!description) {
          return;
        }

        editBookmarkDescription(args.meta, description);
      });
  });

  // 快速跳转到书签位置,并预览书签
  registerCommand(context, CMD_JUMP_TO_BOOKMARK, (args) => {
    quicklyJumpToBookmark();
  });

  // 改变书签颜色
  registerCommand(context, CMD_CHANGE_BOOKMARK_COLOR, async (args) => {
    if (!args || !args.meta) {
      window.showInformationMessage('请选择书签后再更改颜色.', {});
      return;
    }
    const { meta } = args;
    if ('color' in meta) {
      const newColor = await chooseBookmarkColor();
      if (!newColor) {
        return;
      }
      BookmarksController.instance.update(meta, {
        color: newColor,
      });
      updateActiveEditorAllDecorations();
    }
  });

  // 删除当前打开的文档中的已存在的书签
  registerCommand(context, 'clearAllBookmarksInCurrentFile', async (args) => {
    const activedEditor = window.activeTextEditor;
    if (!activedEditor) return;
    if (checkIfBookmarksIsInCurrentEditor(activedEditor)) {
      BookmarksController.instance.clearAllBookmarkInFile(
        activedEditor.document.uri
      );
      updateActiveEditorAllDecorations();
    }
  });
}
